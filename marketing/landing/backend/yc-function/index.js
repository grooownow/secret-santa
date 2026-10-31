/**
 * Yandex Cloud Function: приёмник заявок Gridfin (и в перспективе ludvik4).
 *
 * Зачем именно так: 152-ФЗ требует первичной записи персональных данных
 * граждан РФ на территории России. Функция работает на серверах Яндекса в РФ:
 * заявка сначала фиксируется здесь (structured-запись в Cloud Logging),
 * затем письмом уходит на почтовый ящик оператора на российском сервисе.
 *
 * Переменные окружения (задаются в консоли Yandex Cloud, НЕ в коде):
 *   SMTP_HOST  — smtp.yandex.ru или smtp.mail.ru
 *   SMTP_USER  — адрес ящика-отправителя (он же логин)
 *   SMTP_PASS  — пароль приложения этого ящика (secret!)
 *   MAIL_TO    — куда доставлять заявки (можно тот же ящик)
 *   ALLOWED_ORIGINS — через запятую, по умолчанию ludvik4.ru + ludvik4.dev
 */
/* eslint-disable no-console -- console.log IS the RF-side record: Yandex
   Cloud Logging persists function stdout on RF servers (152-FZ, ст. 18). */
const nodemailer = require("nodemailer");

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "https://ludvik4.ru,https://ludvik4.dev"
)
  .split(",")
  .map((s) => s.trim());

const FIELD_LIMIT = 500;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function clip(value) {
  return String(value ?? "")
    .slice(0, FIELD_LIMIT)
    .trim();
}

module.exports.handler = async function (event) {
  const origin =
    (event.headers && (event.headers.Origin || event.headers.origin)) || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false }) };
  }

  let payload;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    payload = JSON.parse(raw);
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: "bad json" }),
    };
  }

  const lead = {
    github: clip(payload.github),
    email: clip(payload.email),
    role: clip(payload.role) || "-",
    usage: clip(payload.usage),
    page: clip(payload.page),
    subject: clip(payload.subject) || "Gridfin early access request",
  };
  if (
    !lead.github ||
    !lead.email ||
    !lead.usage ||
    !/.+@.+\..+/.test(lead.email)
  ) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: "missing fields" }),
    };
  }

  // Первичная запись на территории РФ: structured-лог уходит в Yandex Cloud
  // Logging (хранение в РФ) до любой дальнейшей передачи.
  console.log(
    JSON.stringify({ kind: "lead", at: new Date().toISOString(), ...lead }),
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const text = [
    `GitHub: ${lead.github}`,
    `Email: ${lead.email}`,
    `Роль: ${lead.role}`,
    `Цель: ${lead.usage}`,
    `Страница: ${lead.page}`,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: `Gridfin Landing <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO,
      subject: lead.subject,
      text,
    });
  } catch (err) {
    // Заявка уже записана в лог — сообщаем фронту об успехе приёма,
    // но помечаем сбой доставки для диагностики.
    console.error(JSON.stringify({ kind: "mail-error", message: String(err) }));
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({ ok: true, mailed: false }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, mailed: true }),
  };
};
