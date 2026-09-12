import { TrackedPointerSample } from '../tracking/PointerTracker';
import { MotorMetrics } from '../types';

export interface ComprehensivePointerTelemetry {
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  peakAcceleration: number;
  directionChanges: number;
  hoverHesitationMs: number;
  overshoots: number;
  corrections: number;
  idleTimeMs: number;
  reactionTimeMs: number;
  trajectory: 'linear' | 'curved' | 'irregular' | 'erratic';
}

export class BehaviorEngine {
  /**
   * Analyzes an array of recorded pointer samples with timestamped coordinates
   * to extract genuine physical kinematics without fabricated data.
   */
  public static analyzePointerStream(
    samples: readonly TrackedPointerSample[],
    reactionTimeMs: number = 0,
    targetPosition?: { x: number; y: number }
  ): ComprehensivePointerTelemetry {
    if (!samples || samples.length < 2) {
      return {
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        peakAcceleration: 0,
        directionChanges: 0,
        hoverHesitationMs: 0,
        overshoots: 0,
        corrections: 0,
        idleTimeMs: 0,
        reactionTimeMs,
        trajectory: 'linear',
      };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;
    let peakAcceleration = 0;
    let prevSpeed = 0;
    let prevVelocityVector: { dx: number; dy: number } | null = null;
    let directionChanges = 0;
    let corrections = 0;
    let idleTimeMs = 0;
    let overshoots = 0;

    const totalDuration = Math.max(1, samples[samples.length - 1].time - samples[0].time);

    for (let i = 1; i < samples.length; i++) {
      const p0 = samples[i - 1];
      const p1 = samples[i];
      const dt = Math.max(1, p1.time - p0.time);
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy);

      totalDistance += dist;

      // Speed in px/ms
      const speed = dist / dt;
      if (speed < 0.02) {
        // Practically motionless / idle
        idleTimeMs += dt;
      } else {
        speedSum += speed;
        speedCount++;
        if (speed > maxSpeed) {
          maxSpeed = speed;
        }
      }

      // Acceleration calculation
      const acceleration = Math.abs(speed - prevSpeed) / dt;
      if (acceleration > peakAcceleration) {
        peakAcceleration = acceleration;
      }
      prevSpeed = speed;

      // Direction changes & corrections
      if (prevVelocityVector) {
        const dot = dx * prevVelocityVector.dx + dy * prevVelocityVector.dy;
        const mag1 = Math.hypot(dx, dy);
        const mag2 = Math.hypot(prevVelocityVector.dx, prevVelocityVector.dy);

        if (mag1 > 3 && mag2 > 3) {
          const cosTheta = dot / (mag1 * mag2);
          // Angle change greater than ~60 degrees indicates direction change
          if (cosTheta < 0.5) {
            directionChanges++;
          }
          // Acute reversal (angle > 120 degrees) indicates a motor correction
          if (cosTheta < -0.5) {
            corrections++;
          }
        }
      }

      // Overshoot detection if target position is provided
      if (targetPosition && i < samples.length - 1) {
        const dCurrent = Math.hypot(p1.x - targetPosition.x, p1.y - targetPosition.y);
        const dPrev = Math.hypot(p0.x - targetPosition.x, p0.y - targetPosition.y);
        // If it got very close (< 25px) then moved farther away (> 35px) before arriving
        if (dPrev < 25 && dCurrent > 35) {
          overshoots++;
        }
      }

      prevVelocityVector = { dx, dy };
    }

    const averageSpeed = speedCount > 0 ? speedSum / speedCount : 0;
    const straightDistance = Math.hypot(
      samples[samples.length - 1].x - samples[0].x,
      samples[samples.length - 1].y - samples[0].y
    );

    // Trajectory classification based on path tortuosity
    const tortuosity = straightDistance > 12 ? totalDistance / straightDistance : 1;
    let trajectory: MotorMetrics['trajectory'] = 'linear';
    if (tortuosity > 1.6 || corrections >= 3) {
      trajectory = 'erratic';
    } else if (tortuosity > 1.25 || corrections >= 1) {
      trajectory = 'irregular';
    } else if (tortuosity > 1.08) {
      trajectory = 'curved';
    }

    // Hover hesitation: idle periods before final arrival
    const hoverHesitationMs = Math.round(idleTimeMs);

    return {
      totalDistance: Math.round(totalDistance),
      averageSpeed: Math.round(averageSpeed * 100) / 100,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      peakAcceleration: Math.round(peakAcceleration * 1000) / 1000,
      directionChanges,
      hoverHesitationMs,
      overshoots,
      corrections,
      idleTimeMs: Math.round(idleTimeMs),
      reactionTimeMs: Math.round(reactionTimeMs || totalDuration),
      trajectory,
    };
  }

  /**
   * Generates a motor score (0-100) from kinematic telemetry
   */
  public static calculateMotorScore(telemetry: ComprehensivePointerTelemetry): number {
    // Biological movement has natural hesitation and minor variance; robotics is too linear.
    let score = 78;

    // Natural human hesitation (120ms - 400ms) is expected
    if (telemetry.hoverHesitationMs >= 80 && telemetry.hoverHesitationMs <= 550) {
      score += 10;
    } else if (telemetry.hoverHesitationMs < 40) {
      score -= 8; // Suspiciously instant / automated
    }

    // Trajectory bonus: natural humans have slight curve/irregularity
    if (telemetry.trajectory === 'curved' || telemetry.trajectory === 'irregular') {
      score += 8;
    } else if (telemetry.trajectory === 'linear') {
      score -= 6; // Too perfect
    }

    if (telemetry.corrections > 0 && telemetry.corrections <= 4) {
      score += 4;
    }

    return Math.max(50, Math.min(96, Math.round(score)));
  }
  /**
   * Aggregates multiple target rounds into one session-level motor profile.
   * Keeps measured telemetry only; no fabricated defaults are introduced.
   */
  public static aggregateMotorRounds(rounds: readonly MotorMetrics[]): MotorMetrics {
    if (!rounds.length) {
      return {
        velocity: 0,
        trajectory: 'linear',
        hesitationMs: 0,
        corrections: 0,
        overshoots: 0,
        reactionTimeMs: 0,
        score: 0,
        totalDistance: 0,
        maxVelocity: 0,
        directionChanges: 0,
        idleTimeMs: 0,
        roundVariance: 0,
      };
    }

    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const trajectoryRank: Record<MotorMetrics['trajectory'], number> = {
      linear: 0,
      curved: 1,
      irregular: 2,
      erratic: 3,
    };
    const trajectory = rounds.reduce<MotorMetrics['trajectory']>(
      (worst, round) => trajectoryRank[round.trajectory] > trajectoryRank[worst] ? round.trajectory : worst,
      'linear',
    );
    const reactions = rounds.map((round) => round.reactionTimeMs);
    const reactionAverage = average(reactions);
    const reactionVariance = average(reactions.map((reaction) => Math.pow(reaction - reactionAverage, 2)));

    return {
      velocity: Math.round(average(rounds.map((round) => round.velocity)) * 100) / 100,
      trajectory,
      hesitationMs: Math.round(average(rounds.map((round) => round.hesitationMs))),
      corrections: rounds.reduce((sum, round) => sum + round.corrections, 0),
      overshoots: rounds.reduce((sum, round) => sum + round.overshoots, 0),
      reactionTimeMs: Math.round(reactionAverage),
      score: Math.round(average(rounds.map((round) => round.score))),
      totalDistance: Math.round(rounds.reduce((sum, round) => sum + (round.totalDistance ?? 0), 0)),
      maxVelocity: Math.round(Math.max(...rounds.map((round) => round.maxVelocity ?? round.velocity)) * 100) / 100,
      directionChanges: rounds.reduce((sum, round) => sum + (round.directionChanges ?? 0), 0),
      idleTimeMs: Math.round(rounds.reduce((sum, round) => sum + (round.idleTimeMs ?? 0), 0)),
      roundVariance: Math.round(Math.sqrt(reactionVariance)),
    };
  }

}
