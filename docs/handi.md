England Golf uses the **World Handicap System (WHS)** for amateurs — same core rules as The R&A / USGA, with England-specific admin (club WHS platform or **iGolf** if you’re not in a club). It launched in England on **2 November 2020**. Your portable number is a **Handicap Index**, not “shots off par”.

There are three different numbers. Mixing them up is why it feels confusing.

| Number | What it is |
|---|---|
| **Handicap Index** | Ability measure that travels with you (e.g. 14.8). Max **54.0**. |
| **Course Handicap** | Strokes you get **today**, on **these tees**. |
| **Playing Handicap** | Course Handicap × competition allowance (e.g. 95% medal). Used for results, **not** for updating the Index. |

---

## 1. Cap each hole first (Adjusted Gross Score)

Before any formula, each hole is limited to **net double bogey**:

\[
Max hole score = Par + 2 + shots received on that hole
\]

Shots received come from your Course Handicap vs stroke index. A 10 on a par 4 where you get one shot counts as **7**. Sum of capped holes = **Adjusted Gross Score (AGS)**. That AGS — not the raw card total — goes into the maths.

Unplayed holes use an **expected score** (not simply net par) under current WHS rules.

---

## 2. Turn the round into a Score Differential

Official formula:

\[
Score Differential = 113/Slope Rating*(AGS - Course Rating - PCC)
\]

Rounded to **one decimal place**.

- **Course Rating (CR):** expected score for a scratch golfer from those tees.
- **Slope Rating:** relative difficulty for a bogey golfer vs scratch. Neutral / “standard” slope is **113**. Typical GB&I slopes are often around the mid-120s.
- **PCC (Playing Conditions Calculation):** automatic daily adjustment from **−1 to +3** if the field scored much easier or harder than expected. Often **0**. Needs enough scores in that day on that course.

**Example:** AGS 92, CR 71.5, Slope 125, PCC 0:

\[
113/125 * (92 - 71.5) = 0.904 * 20.5 = 18.5
\]

Lower differential = better round (relative to the course).

**9-hole scores** count. Since 2024 they are scaled to an 18-hole differential using an **expected score** for the other nine, then treated like any other card.

---

## 3. Handicap Index algorithm (the rolling average)

Keep a scoring record of acceptable scores. With a full record:

\[
Handicap Index = average of the best 8 Score Differentials from the most recent 20
\]

Rounded to one decimal. Updates **overnight** after a new acceptable score is posted. Oldest of the 20 drops off when a 21st arrives. Bad rounds usually sit outside the best 8, so one blow-up barely moves you; a hot streak does.

### Fewer than 20 scores (new / building handicap)

Minimum to get an Index: **54 holes** (any mix of 9- and 18-hole cards). Then this table is used:

| Scores in record | What is averaged | Extra adjustment |
|---|---|---|
| 3 | Lowest 1 | −2.0 |
| 4 | Lowest 1 | −1.0 |
| 5 | Lowest 1 | 0 |
| 6 | Lowest 2 | −1.0 |
| 7–8 | Lowest 2 | 0 |
| 9–11 | Lowest 3 | 0 |
| 12–14 | Lowest 4 | 0 |
| 15–16 | Lowest 5 | 0 |
| 17–18 | Lowest 6 | 0 |
| 19 | Lowest 7 | 0 |
| 20+ | Lowest 8 | 0 |

So with 3 cards, Index ≈ **best differential minus 2**.

---

## 4. Caps so the Index cannot rocket up

Based on your **Low Handicap Index** in the last 12 months:

- **Soft cap:** once you are **3.0** above that low, further *upward* movement is **halved**.
- **Hard cap:** Index cannot go more than **5.0** above that low.

**Exceptional Score Reduction (ESR):** a round far better than expected can trigger an extra automatic cut (typically −1 or −2 on top of the new average).

Handicap committees can also adjust after a review if the record doesn’t match demonstrated ability.

---

## 5. Course Handicap (what you actually play off socially)

England Golf formula (includes **CR − Par** since April 2024):

\[
Course Handicap = Handicap Index * Slope / 113 + (CR - Par)
\]

Then **rounded** to a whole number for play.

Same Index gives **more shots** on a high-slope, high CR-vs-par set of tees.

---

## 6. Playing Handicap (competitions only)

\[
Playing Handicap = Course Handicap * handicap allowance
\]

Typical England allowances (mandatory in competitions):

- Individual stroke play / Stableford / Par-Bogey: **95%**
- Four-ball better ball: **85%**
- Foursomes: **50%** of combined Course Handicaps
- Greensomes: **60%** low + **40%** high Course Handicap

Playing Handicap is for **who wins**. The Index is always recalculated from AGS, CR, Slope and PCC — not from Playing Handicap.

---

## What counts as an acceptable score (England)

- Individual **stroke play** or **Stableford** over a **rated** course/tees.
- Competition cards and general play / supplementary cards (pre-registered, attested, posted **the same day** so PCC can apply).
- Mix of 9 and 18 holes.
- Team and match play are generally **not** used for the Index in England (some limited team formats have extra rules).

You get an official Index via an **affiliated club** or **England Golf iGolf**. VPAR’s own handicap is a separate product and is **not** an England Golf / WHS Index.

Official detail: [englandgolf.org/world-handicap-system](https://www.englandgolf.org/world-handicap-system/) and the Rules of Handicapping player guide on that site.