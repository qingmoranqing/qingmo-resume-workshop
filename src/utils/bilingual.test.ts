import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RESUMES } from '../data/defaultResumes';
import {
  applyEnglishTranslation,
  buildTranslateResumePrompt,
  extractResumeKeyContent,
  findBilingualPair,
  parseExternalTranslateResumeJson,
} from './bilingual';
import { cloneResumeDoc } from './resumeLogic';

test('extractResumeKeyContent identifies key resume sections, terms, and omits photo/sensitive contacts', () => {
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const { payload, summary } = extractResumeKeyContent(doc);

  assert.equal(summary.hasContent, true);
  assert.equal(summary.expCount, 2);
  assert.equal(summary.bulletCount, 4);
  assert.equal(summary.skillGroupCount, 2);
  assert.equal(summary.eduCount, 1);
  assert.ok(summary.keyTerms.length >= 3);
  assert.equal('photo' in (payload.basic as Record<string, unknown>), false);
  assert.equal('phone' in (payload.basic as Record<string, unknown>), false);
});

test('applyEnglishTranslation creates linked English version, switches titles to English, and preserves Chinese original', () => {
  const zhDoc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const zhOriginalName = zhDoc.name;
  const zhOriginalHeadline = zhDoc.data.basic.headline;

  const enDoc = applyEnglishTranslation(
    zhDoc,
    {
      basic: {
        name: 'Chenyu Jiang',
        headline: 'Business Data Analyst | SQL & Python Automation · BI Dashboards · Retention Analytics',
        location: 'Shenzhen, China',
      },
      intent: {
        position: 'Business Data Analyst / BI Analyst',
        city: 'Shenzhen / Guangzhou',
        salary: '14K - 18K RMB/mo',
        availability: 'Available within 2 weeks',
      },
      experience: [
        {
          id: zhDoc.data.experience[0].id,
          company: 'Xingyun Smart Retail Tech Co., Ltd.',
          role: 'Business Data Analyst',
          period: '2022.07 - 至今',
          subtitle: 'Led omnichannel inventory data governance and automated BI reporting for 40+ retail stores.',
          kpis: [
            { num: '85%', label: 'Weekly Reporting Time Cut' },
            { num: '100%', label: 'Cross-Channel Reconciliation Accuracy' },
          ],
          bullets: [
            '**Automated Data Pipeline**: Replaced manual VLOOKUPs with **Python (Pandas) + SQL**, cutting weekly report turnaround from 1.5 days to **2 hours**.',
          ],
        },
      ],
      skills: [
        {
          id: zhDoc.data.skills[0].id,
          cat: 'Data Engineering & Programming',
          items: 'SQL (Window Functions/CTE), Python (Pandas/NumPy), Excel (PowerQuery)',
        },
      ],
      glossaryNotes: [
        '进销存数据治理 → Omnichannel Inventory Data Governance',
        '复购归因 → Retention Attribution',
      ],
    },
    { existingNames: [zhDoc.name], modelUsed: 'deepseek-chat' },
  );

  // Original Chinese doc untouched
  assert.equal(zhDoc.name, zhOriginalName);
  assert.equal(zhDoc.data.basic.headline, zhOriginalHeadline);
  assert.equal(zhDoc.bilingual, undefined);

  // English version properly constructed and linked
  assert.notEqual(enDoc.id, zhDoc.id);
  assert.ok(enDoc.name.includes('English 专业版'));
  assert.equal(enDoc.bilingual?.lang, 'en');
  assert.equal(enDoc.bilingual?.pairedId, zhDoc.id);
  assert.equal(enDoc.bilingual?.modelUsed, 'deepseek-chat');
  assert.equal(enDoc.bilingual?.glossaryNotes?.length, 2);
  assert.equal(enDoc.meta.titles.experience, 'EXPERIENCE');
  assert.equal(enDoc.meta.titles.skills, 'SKILLS');
  assert.equal(enDoc.data.basic.phone, zhDoc.data.basic.phone);
  assert.equal(enDoc.data.experience[0].period, '2022.07 - Present');
  assert.ok(enDoc.data.experience[0].bullets[0].includes('Automated Data Pipeline'));

  // Bidirectional pair lookup works from both Chinese and English versions
  const list = [zhDoc, enDoc];
  const fromZh = findBilingualPair(list, zhDoc);
  assert.equal(fromZh.direction, 'to-en');
  assert.equal(fromZh.sibling?.id, enDoc.id);

  const fromEn = findBilingualPair(list, enDoc);
  assert.equal(fromEn.direction, 'to-zh');
  assert.equal(fromEn.sibling?.id, zhDoc.id);
});

test('buildTranslateResumePrompt and parseExternalTranslateResumeJson handle DeepSeek-R1 <think> traces and fences', () => {
  const prompt = buildTranslateResumePrompt(DEFAULT_RESUMES[0]);
  assert.ok(prompt.includes('glossaryNotes'));
  assert.ok(prompt.includes('星云智选零售科技有限公司'));

  const raw = `<think>Analyzing terms { "term": "复购" }...</think>
\`\`\`json
{
  "basic": { "name": "Chenyu Jiang", "headline": "Business Data Analyst" },
  "experience": [{ "company": "Xingyun Retail", "role": "Data Analyst", "bullets": ["**Built BI suite** driving 19% faster turnover."] }],
  "glossaryNotes": ["滞销预警 → Slow-Moving Inventory Alert"]
}
\`\`\``;
  const parsed = parseExternalTranslateResumeJson(raw);
  assert.equal(parsed.basic?.name, 'Chenyu Jiang');
  assert.equal(parsed.glossaryNotes?.[0], '滞销预警 → Slow-Moving Inventory Alert');

  assert.throws(() => parseExternalTranslateResumeJson('invalid'), /合法 JSON/);
  assert.throws(() => parseExternalTranslateResumeJson('{}'), /缺少英文简历核心字段/);
});
