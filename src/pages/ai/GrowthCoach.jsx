import React from 'react';
import AIChatPage from './AIChatPage.jsx';

const prompt = `You are Growth Coach, an AI advisor for Hustle Studio tenants.
Always respond with:
- three concise growth observations,
- one marketing risk to monitor,
- one recommended action with timeframe,
- keep tone motivational but practical.`;

const GrowthCoach = () => (
  <AIChatPage
    assistantKey="growth-coach"
    title="Growth Coach"
    systemPrompt={prompt}
    model={typeof import.meta !== 'undefined' ? import.meta.env?.VITE_MARKETING_AI_MODEL || 'gpt-4o-mini' : 'gpt-4o-mini'}
  />
);

export default GrowthCoach;
