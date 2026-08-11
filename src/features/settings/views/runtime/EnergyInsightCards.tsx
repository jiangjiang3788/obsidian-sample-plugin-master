/** @jsxImportSource preact */
import { h } from 'preact';
import type { EnergyManagementModel, EnergyWeeklyReview } from '@core/energy/public';

interface EnergyInsightCardsProps {
  review?: EnergyWeeklyReview | null;
  management?: EnergyManagementModel | null;
}

function rhythmText(review?: EnergyWeeklyReview | null): string {
  if (!review?.bestDaypart && !review?.lowestDaypart) return '继续记录几天后，这里会形成你的日内节律。';
  if (review.bestDaypart && review.lowestDaypart) return `${review.bestDaypart.label}通常较高，${review.lowestDaypart.label}相对偏低。`;
  if (review.bestDaypart) return `${review.bestDaypart.label}目前相对较高。`;
  return `${review?.lowestDaypart?.label}目前相对偏低。`;
}

function effectsText(review?: EnergyWeeklyReview | null): string {
  const recovery = review?.topRecovery?.label;
  const depletion = review?.topDepletion?.label;
  if (recovery && depletion) return `${recovery}更像恢复，${depletion}更像消耗。`;
  if (recovery) return `${recovery}目前更像恢复候选。`;
  if (depletion) return `${depletion}目前更像消耗候选。`;
  return '样本还不足，暂不把活动贴上恢复或消耗标签。';
}

function managementText(management?: EnergyManagementModel | null): string {
  const guardrail = management?.guardrails?.[0];
  if (guardrail) return `${guardrail.title}：${guardrail.detail}`;
  if (management?.guidance) return management.guidance;
  return '继续记录后，这里只保留最值得行动的一条提示。';
}

export function EnergyInsightCards({ review, management }: EnergyInsightCardsProps) {
  const cards = [
    { icon: '≈', title: '本周节律', text: rhythmText(review) },
    { icon: '◇', title: '恢复 / 消耗', text: effectsText(review) },
    { icon: '✦', title: '管理提示', text: managementText(management) },
  ];
  return (
    <div class="think-energy-insights" aria-label="精力洞察摘要">
      {cards.map((card) => (
        <div class="think-energy-insight" key={card.title}>
          <span class="think-energy-insight__icon">{card.icon}</span>
          <div><strong>{card.title}</strong><p>{card.text}</p></div>
        </div>
      ))}
    </div>
  );
}
