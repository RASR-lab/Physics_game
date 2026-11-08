/**
 * Equations from the PHYS 211 equation sheet (Radue & Bhat), written the way the sheet writes them.
 * Used by the "Pick the equation" step. A few entries combine two sheet equations into the
 * relation a problem actually uses; their `from` note says which sheet lines they come from.
 */
export interface SheetEquation {
  tex: string;
  /** Where it lives on the sheet. */
  sheet: string;
  from?: string;
}

export const EQUATIONS = {
  /* Ch 2 Kinematics */
  vAvg: { tex: String.raw`\bar v = \frac{\Delta x}{\Delta t} = \frac{v_0 + v}{2}`, sheet: "Ch 2 Kinematics" },
  vLin: { tex: String.raw`v = v_0 + at`, sheet: "Ch 2 Kinematics" },
  aDef: { tex: String.raw`a = \frac{\Delta v}{\Delta t} = \frac{v - v_0}{t}`, sheet: "Ch 2 Kinematics" },
  xQuad: { tex: String.raw`x = x_0 + v_0t + \tfrac12at^2`, sheet: "Ch 2 Kinematics" },
  vSq: { tex: String.raw`v^2 = v_0^2 + 2a\Delta x`, sheet: "Ch 2 Kinematics" },
  /* Ch 3 Vectors */
  comps: { tex: String.raw`v_x = v\cos\theta,\quad v_y = v\sin\theta`, sheet: "Ch 3 Vectors" },
  magAng: { tex: String.raw`|v| = \sqrt{v_x^2 + v_y^2},\quad \theta = \tan^{-1}\!\left(\frac{v_y}{v_x}\right)`, sheet: "Ch 3 Vectors" },
  projXY: {
    tex: String.raw`x = (v_0\cos\theta)t,\quad y = (v_0\sin\theta)t - \tfrac12 gt^2`,
    sheet: "Ch 2 + Ch 3",
    from: "x = x₀ + v₀t + ½at² applied to each component",
  },
  /* Ch 5 Newton's laws */
  newton2: { tex: String.raw`\sum \vec F = \vec F_{NET} = m\vec a`, sheet: "Ch 5 Newton's Laws" },
  weight: { tex: String.raw`Weight = m\vec g`, sheet: "Ch 5 Newton's Laws" },
  /* Ch 6 Applications */
  fKin: { tex: String.raw`f_k = \mu_k F_{Norm}`, sheet: "Ch 6 Newton's Laws appl." },
  fStat: { tex: String.raw`f_s \le \mu_s F_{Norm}`, sheet: "Ch 6 Newton's Laws appl." },
  spring: { tex: String.raw`\vec F_{spring} = -k\,\Delta\vec x`, sheet: "Ch 6 Newton's Laws appl." },
  fCent: { tex: String.raw`f_c = ma_c = \frac{mv_t^2}{r}`, sheet: "Ch 6 Newton's Laws appl." },
  /* Ch 7–9 */
  work: { tex: String.raw`Work = \vec F\cdot\vec d = F(\cos\theta)d`, sheet: "Ch 7 Work & Kinetic Energy" },
  kLin: { tex: String.raw`K_{linear} = \tfrac12 mv^2`, sheet: "Ch 7 Work & Kinetic Energy" },
  uGrav: { tex: String.raw`PE_{gravity} = U_g = mgy`, sheet: "Ch 8 Potential Energy" },
  momentum: { tex: String.raw`\vec p = m\vec v`, sheet: "Ch 9 Momentum" },
  /* Ch 10 Rotational kinematics */
  arc: { tex: String.raw`s = r\theta`, sheet: "Ch 10 Rotational Kinematics" },
  vTan: { tex: String.raw`v_t = r\omega`, sheet: "Ch 10 Rotational Kinematics" },
  aCent: { tex: String.raw`a_c = \frac{v_t^2}{r} = r\omega^2`, sheet: "Ch 10 Rotational Kinematics" },
  wLin: { tex: String.raw`\omega = \omega_0 + \alpha t`, sheet: "Ch 10 Rotational Kinematics" },
  wSq: { tex: String.raw`\omega^2 = \omega_0^2 + 2\alpha\Delta\theta`, sheet: "Ch 10 Rotational Kinematics" },
  thQuad: { tex: String.raw`\Delta\theta = \omega_0t + \tfrac12\alpha t^2`, sheet: "Ch 10 Rotational Kinematics" },
  kRot: { tex: String.raw`K_{rot} = \tfrac12 I\omega^2`, sheet: "Ch 10 Rotational Kinematics" },
  rollEnergy: {
    tex: String.raw`mgy = \tfrac12 mv^2 + \tfrac12 I\omega^2,\quad v_{cm} = r\omega`,
    sheet: "Ch 8 + Ch 10",
    from: "U_g = mgy, K_linear, K_rot and the non-slipping condition",
  },
  /* Ch 11 Rotational dynamics */
  torque: { tex: String.raw`\tau = rF_\perp = rF\sin(\theta)`, sheet: "Ch 11 Rotational Dynamics" },
  newton2Rot: { tex: String.raw`\sum\vec\tau = \vec\tau_{Net} = I\vec\alpha`, sheet: "Ch 11 Rotational Dynamics" },
  angMom: { tex: String.raw`\vec L = I\vec\omega`, sheet: "Ch 11 Rotational Dynamics" },
  angMomCons: { tex: String.raw`\vec L_i = \vec L_f \;\Rightarrow\; I_i\omega_i = I_f\omega_f`, sheet: "Ch 11 Rotational Dynamics" },
  /* Ch 12 Gravity */
  gravLaw: { tex: String.raw`F_g = \frac{Gm_1m_2}{r^2}`, sheet: "Ch 12 Gravity" },
  gAlt: { tex: String.raw`a_g = \frac{GM_E}{r^2} = \frac{GM_E}{(R_E + h)^2}`, sheet: "Ch 12 Gravity" },
  uGravFar: { tex: String.raw`U_g = -\frac{Gm_1m_2}{r}`, sheet: "Ch 12 Gravity" },
  orbit: {
    tex: String.raw`\frac{Gm_1m_2}{r^2} = \frac{mv_t^2}{r}`,
    sheet: "Ch 12 + Ch 6",
    from: "F_g = Gm₁m₂/r² supplies f_c = mv²/r",
  },
  energyFar: {
    tex: String.raw`\tfrac12 mv_i^2 - \frac{Gm_1m_2}{r_i} = \tfrac12 mv_f^2 - \frac{Gm_1m_2}{r_f}`,
    sheet: "Ch 12 + Ch 8",
    from: "energy conservation with U_g = −Gm₁m₂/r",
  },
  /* Ch 13 Oscillations */
  shmX: { tex: String.raw`x = A\cos(\omega t)`, sheet: "Ch 13 Oscillations" },
  shmV: { tex: String.raw`v = -A\omega\sin(\omega t)`, sheet: "Ch 13 Oscillations" },
  periodSpring: { tex: String.raw`T = 2\pi\sqrt{\frac{m}{k}}`, sheet: "Ch 13 Oscillations" },
  freqSpring: { tex: String.raw`f = \frac{1}{2\pi}\sqrt{\frac{k}{m}}`, sheet: "Ch 13 Oscillations" },
  periodPend: { tex: String.raw`T = 2\pi\sqrt{\frac{L}{g}}`, sheet: "Ch 13 Oscillations" },
  /* Ch 14 (distractor) */
  waveSpeed: { tex: String.raw`v = f\lambda = \frac{\lambda}{T}`, sheet: "Ch 14 Waves" },
} satisfies Record<string, SheetEquation>;

export type EqId = keyof typeof EQUATIONS;

export interface PickEquation {
  /** Defaults to "Which equation from your sheet gets you to the answer?" */
  prompt?: string;
  correct: EqId;
  distractors: [EqId, EqId, EqId];
  /** Why the right one fits (and why the tempting wrong one doesn't). */
  why: string;
}

/** The equation question for every level, keyed by level id. */
export const PICK_EQUATION: Record<string, PickEquation> = {
  /* ---- Ch 2 ---- */
  "2-1": { correct: "vSq", distractors: ["xQuad", "vLin", "vAvg"], why: "You know v₀, the distance and the final speed (0), and you don't know the time. v² = v₀² + 2aΔx is the one equation with no t in it." },
  "2-2": { correct: "xQuad", distractors: ["vSq", "vLin", "vAvg"], why: "You know the time, the acceleration (g) and v₀ = 0, and want the distance. x = x₀ + v₀t + ½at² links exactly those. The others need the final speed." },
  "2-3": { correct: "vLin", distractors: ["xQuad", "vSq", "weight"], why: "The graph is velocity vs. time. v = v₀ + at is a straight line: v₀ is where it starts, a is the slope." },
  "2-4": { correct: "xQuad", distractors: ["vSq", "vLin", "weight"], why: "Both of you cover the same distance in the same time. x = x₀ + v₀t + ½at² describes both: the bus with a = 0, you with v₀ = 0. The others need your final speed, which you don't know yet." },
  "2-5": { correct: "vSq", distractors: ["xQuad", "vLin", "weight"], why: "You know the height, the speed at the top (0) and a = −g, and want v₀. No time is given, so use v² = v₀² + 2aΔx." },
  /* ---- Ch 3 ---- */
  "3-1": { correct: "magAng", distractors: ["comps", "xQuad", "vSq"], why: "You know the components (east and north) and need the length and direction. That's magnitude and angle. v_x = v cos θ goes the other way: from length to components." },
  "3-2": { correct: "comps", distractors: ["magAng", "vSq", "fCent"], why: "You need the ferry's east–west component to cancel the current: v cos θ + v_current = 0. That's a component equation." },
  "3-3": { correct: "projXY", distractors: ["vSq", "magAng", "fCent"], why: "A projectile moves in x and y at once. Split v₀ into components and use x = x₀ + v₀t + ½at² for each direction (a = 0 in x, −g in y)." },
  "3-4": { correct: "magAng", distractors: ["comps", "xQuad", "torque"], why: "Subtract the components to get leg 2's east and north parts, then turn them into a length and a direction with |v| = √(v_x² + v_y²) and θ = tan⁻¹(v_y/v_x)." },
  "3-5": { correct: "xQuad", distractors: ["vSq", "magAng", "fCent"], why: "Use x = x₀ + v₀t + ½at² twice: vertically (v₀ = 0, a = −g) to get the fall time, then horizontally (a = 0) to get the speed." },
  /* ---- Ch 5 ---- */
  "5-1": { correct: "newton2", distractors: ["weight", "fKin", "fCent"], why: "A force changes the crate's motion through ΣF = ma. After the thruster stops, ΣF = 0 and the velocity stays constant." },
  "5-2": { correct: "newton2", distractors: ["weight", "fStat", "fCent"], why: "The scale reads the normal force N. ΣF = ma gives N − mg = ma. Weight = mg alone only works when a = 0, the mistake this level targets." },
  "5-3": { correct: "newton2", distractors: ["weight", "fKin", "fCent"], why: "Equal forces act on both skaters; a = F/m tells you how much each one speeds up." },
  "5-4": { correct: "newton2", distractors: ["weight", "fKin", "spring"], why: "Apply ΣF = ma twice: to both carts (a = F/(m₁+m₂)) and to the back cart alone (T = m₂a). The rope's tension isn't the back cart's weight." },
  "5-5": { correct: "newton2", distractors: ["weight", "fKin", "fCent"], why: "Apply ΣF = ma to the whole system: mg = (M + m)a. The string tension is NOT the weight mg, or the weight couldn't speed up." },
  /* ---- Ch 6 ---- */
  "6-1": { correct: "fStat", distractors: ["fKin", "weight", "spring"], why: "The crate isn't moving yet, so it's static friction, and the steepest angle is where it hits its limit: f_s = μ_s F_Norm." },
  "6-2": { correct: "spring", distractors: ["fKin", "fCent", "vSq"], why: "Hooke's law: at rest the spring force kΔx balances the weight mg." },
  "6-3": { correct: "fCent", distractors: ["fKin", "spring", "weight"], why: "Turning in a circle needs a force toward the center: f_c = mv²/r. Here friction supplies it, up to μ_s·mg." },
  "6-4": { correct: "fKin", distractors: ["fStat", "spring", "fCent"], why: "The crate is sliding, so it's kinetic friction, f_k = μ_k F_Norm. Steady speed means your push has to equal it exactly." },
  "6-5": { correct: "fCent", distractors: ["fKin", "fStat", "spring"], why: "There's no friction on ice. The sideways part of the normal force must supply f_c = mv²/r." },
  /* ---- Ch 10 ---- */
  "10-1": { correct: "wSq", distractors: ["wLin", "thQuad", "vTan"], why: "You know ω₀, the final ω (0) and the angle (turns × 2π), and want α. No time is given, so use ω² = ω₀² + 2αΔθ, the rotational twin of v² = v₀² + 2aΔx." },
  "10-2": { correct: "vTan", distractors: ["aCent", "wLin", "arc"], why: "Speed along the circle is v_t = rω. Every rider shares ω, but r is different." },
  "10-3": { correct: "rollEnergy", distractors: ["vSq", "kRot", "newton2Rot"], why: "Height energy turns into moving energy AND spinning energy, with v = rω linking them. Using v² = 2gh alone treats the cylinder like a sliding block." },
  "10-4": { correct: "vTan", distractors: ["aCent", "wSq", "torque"], why: "The chain's speed is the same on both gears: r_front ω_pedal = r_rear ω_wheel. Then the bike's speed is v = R ω_wheel. That's v_t = rω, used three times." },
  "10-5": { correct: "aCent", distractors: ["vTan", "wSq", "kRot"], why: "a_c = rω² links the acceleration you need to the spin rate. Then convert ω to rpm." },
  /* ---- Ch 11 ---- */
  "11-1": { correct: "torque", distractors: ["angMom", "fCent", "kRot"], why: "Balance means the torques cancel: each weight gives τ = rF, so set m₁g·r₁ = m₂g·r₂." },
  "11-2": { correct: "torque", distractors: ["work", "angMom", "newton2"], why: "Twist comes from τ = rF sin θ. Watch out: Work = Fd cos θ looks similar but uses cos and a distance moved, not a lever arm." },
  "11-3": { correct: "angMomCons", distractors: ["torque", "kRot", "newton2Rot"], why: "No outside torque acts on the skater, so angular momentum is conserved: I_i ω_i = I_f ω_f. Her spin energy ½Iω² is NOT conserved; her muscles add energy." },
  "11-4": { correct: "newton2Rot", distractors: ["angMom", "kRot", "newton2"], why: "Torque makes the door's spin speed up: Στ = Iα (with τ = rF and I = ⅓ML²), then Δθ = ½αt². ΣF = ma is for straight-line motion." },
  "11-5": { correct: "newton2Rot", distractors: ["weight", "angMom", "vTan"], why: "The rope's tension makes the torque that spins the drum: TR = Iα. Combine it with mg − T = ma for the bucket. The tension is NOT just mg." },
  /* ---- Ch 12 ---- */
  "12-1": { correct: "gAlt", distractors: ["uGravFar", "weight", "fCent"], why: "a_g = GM_E/(R_E + h)² tells you how gravity weakens with height. Measure r from Earth's center, not from the ground." },
  "12-2": { correct: "orbit", distractors: ["uGravFar", "vSq", "weight"], why: "In a circular orbit, gravity IS the centripetal force: Gm₁m₂/r² = mv²/r. Solve it for v." },
  "12-3": { correct: "gravLaw", distractors: ["uGravFar", "fCent", "weight"], why: "Write F_g = Gm₁m₂/r² for Earth's pull and for the Moon's pull, and set them equal. Distance is squared, which is why the point is so close to the Moon." },
  "12-4": { correct: "orbit", distractors: ["periodSpring", "uGravFar", "gAlt"], why: "Gravity supplies the centripetal force (Gm₁m₂/r² = mv²/r) to get v, then T = 2πr/v. T = 2π√(m/k) is for springs, not orbits." },
  "12-5": { correct: "energyFar", distractors: ["vSq", "uGrav", "gAlt"], why: "Hundreds of km up, gravity is much weaker, so mgy and v² = v₀² + 2aΔx (constant g) overshoot. Energy conservation with U_g = −Gm₁m₂/r handles the changing pull." },
  /* ---- Ch 13 ---- */
  "13-1": { correct: "periodPend", distractors: ["periodSpring", "shmV", "waveSpeed"], why: "A pendulum's period is T = 2π√(L/g): it depends on the length, not the mass. T = 2π√(m/k) is for a mass on a spring." },
  "13-2": { correct: "freqSpring", distractors: ["periodPend", "spring", "waveSpeed"], why: "The car body bouncing on its spring is a mass–spring oscillator: f = (1/2π)√(k/m). F = −kΔx alone tells you the force, not how fast it bounces." },
  "13-3": { correct: "periodSpring", distractors: ["periodPend", "shmV", "spring"], prompt: "The pull-back sets the wave's height. Which equation sets its width (the period)?", why: "The period of a mass on a spring is T = 2π√(m/k). Pick k to match the target's period." },
  "13-4": { correct: "shmV", distractors: ["shmX", "periodSpring", "vSq"], why: "v = −Aω sin(ωt) has its biggest size, Aω, at the center. v² = v₀² + 2aΔx needs a constant acceleration, but a spring's force changes with x." },
  "13-5": { correct: "periodSpring", distractors: ["periodPend", "weight", "spring"], why: "T = 2π√(m/k) contains the mass but not gravity, so you can solve it for m even in orbit. Don't forget the chair is part of m." },
};

export const DEFAULT_EQ_PROMPT = "Which equation from your sheet gets you to the answer?";
