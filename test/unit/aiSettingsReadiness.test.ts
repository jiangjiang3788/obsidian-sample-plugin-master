import { DEFAULT_AI_SETTINGS } from '@core/types/public';
import { getAiApiAccessReadiness, getAiSettingsReadiness } from '@features/settings/tabs/aiSettingsReadiness';

describe('AI settings readiness', () => {
    it('allows API access checks before a model has been selected', () => {
        const settings = {
            ...DEFAULT_AI_SETTINGS,
            apiEndpoint: 'https://example.com/v1',
            apiKey: 'secret',
            model: '',
        };

        expect(getAiApiAccessReadiness(settings)).toMatchObject({
            ready: true,
            missingFields: [],
        });
        expect(getAiSettingsReadiness(settings)).toMatchObject({
            ready: false,
            missingFields: ['模型名称'],
        });
    });

    it('requires endpoint and key before model discovery', () => {
        const settings = {
            ...DEFAULT_AI_SETTINGS,
            apiEndpoint: '',
            apiKey: '',
            model: 'gpt-4o-mini',
        };

        expect(getAiApiAccessReadiness(settings)).toMatchObject({
            ready: false,
            missingFields: ['API 端点', 'API 密钥'],
        });
    });
});
