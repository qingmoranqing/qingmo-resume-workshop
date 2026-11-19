import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RESUMES } from '../data/defaultResumes';
import { evaluateResumeCompetitiveness } from './competitiveness';
import { clearPlaceholderContent, cloneResumeDoc, nid } from './resumeLogic';

test('evaluateResumeCompetitiveness returns 4 bounded dimensions and realistic scores for starter resumes', () => {
  const report = evaluateResumeCompetitiveness(DEFAULT_RESUMES[0]);
  assert.equal(report.dimensions.length, 4);
  assert.deepEqual(
    report.dimensions.map((d) => d.label),
    ['行业契合度', '资历深度', '项目丰富度', '描述专业度'],
  );

  for (const dim of report.dimensions) {
    assert.ok(dim.score >= 0 && dim.score <= 100, `${dim.label} score should be 0-100`);
    assert.ok(dim.summary.length > 0);
    assert.ok(dim.tip.length > 0);
  }
  assert.ok(report.overallScore >= 65 && report.overallScore <= 98);
  assert.ok(report.totalExpMonths >= 18);
  assert.equal(report.quantifiedRatioPct, 100);

  // Starter 2 has real experience periods ("2024.07 - 至今" and "2023.03 - 2023.11") without "X年" in extras
  const report2 = evaluateResumeCompetitiveness(DEFAULT_RESUMES[1]);
  assert.ok(report2.totalExpMonths >= 20, `Expected parsed months >= 20 for Starter 2, got ${report2.totalExpMonths}`);
  const seniority2 = report2.dimensions.find((d) => d.key === 'seniorityDepth')!;
  assert.ok(seniority2.score >= 65, `Expected realistic seniorityDepth for Starter 2, got ${seniority2.score}`);
  assert.ok(!seniority2.summary.includes('暂未识别'));
});

test('evaluateResumeCompetitiveness drops sharply on cleared/sparse resumes and rises when projects, metrics, and real contacts are added', () => {
  const richDoc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  richDoc.data.basic.phone = '13812345678';
  richDoc.data.basic.email = 'real.user@gmail.com';
  const richReport = evaluateResumeCompetitiveness(richDoc);

  const clearedDoc = clearPlaceholderContent(richDoc);
  const clearedReport = evaluateResumeCompetitiveness(clearedDoc);

  assert.ok(clearedReport.overallScore < 40, `Expected low score for cleared resume, got ${clearedReport.overallScore}`);
  assert.ok(richReport.overallScore - clearedReport.overallScore >= 40);

  // Adding a dedicated project custom module lifts projectRichness
  const withProject = cloneResumeDoc(richDoc);
  withProject.data.custom.push({
    id: nid('cm'),
    title: '代表项目经历',
    kind: 'cases',
    show: true,
    items: [
      {
        title: '全渠道会员增长与自动化看板重构',
        bg: '多端会员数据割裂',
        action: '搭建统一 RFM 标签与定时回流链路',
        result: '推动季度复购率提升 18%',
        evidence: '上线至 40+ 门店',
      },
    ],
  });
  const baseProj = richReport.dimensions.find((d) => d.key === 'projectRichness')!.score;
  const liftedProj = evaluateResumeCompetitiveness(withProject).dimensions.find(
    (d) => d.key === 'projectRichness',
  )!.score;
  assert.ok(liftedProj > baseProj, `Expected projectRichness to rise (${baseProj} -> ${liftedProj})`);
});

test('evaluateResumeCompetitiveness penalizes weak verbs and missing quantification in writingCraft', () => {
  const doc = cloneResumeDoc(DEFAULT_RESUMES[0]);
  doc.data.basic.phone = '13812345678';
  doc.data.basic.email = 'real.user@gmail.com';
  const strongCraft = evaluateResumeCompetitiveness(doc).dimensions.find(
    (d) => d.key === 'writingCraft',
  )!.score;

  doc.data.experience[0].bullets = [
    '负责日常数据表格整理与汇报工作。',
    '协助团队沟通和对接各个门店的基础需求。',
    '参与运营复盘会议并记录相关事项。',
  ];
  doc.data.experience[1].bullets = ['帮忙整理行业资料文档。'];
  const weakCraftReport = evaluateResumeCompetitiveness(doc);
  const weakCraft = weakCraftReport.dimensions.find((d) => d.key === 'writingCraft')!.score;

  assert.ok(strongCraft - weakCraft >= 35, `Expected large writingCraft drop (${strongCraft} -> ${weakCraft})`);
  assert.equal(weakCraftReport.quantifiedRatioPct, 0);
  assert.equal(weakCraftReport.weakest.key, 'writingCraft');
});
