- **Every fix-and-retry loop is bounded: two honest attempts at the same
  failure, then stop.** Report the exact command output, the state you are in,
  and what you would try next; let the user decide. A third attempt on the same
  red gate is not persistence — it is where you start changing code you have
  stopped understanding, and where a real failure gets buried under repair
  attempts.
- **A loop that waits on a person is not bounded by that budget** — it ends
  when they answer. It owes something else instead: say, before you ask, where
  the flow resumes if the session drops before the answer arrives.
