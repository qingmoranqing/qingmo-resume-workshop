import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RESUMES } from '../data/defaultResumes';
import { cloneResumeDoc } from './resumeLogic';
import { compareResumeVersions, countQuantifiedMetrics, diffTextSegments } from './versionDiff';

test('diffTextSegments highlights exact added and removed CJK and alphanumeric tokens', () => {
  const segs = diffTextSegments(
    '使用 SQL 清洗数据，周报耗时压缩 85%',
    '使用 SQL 与 ClickHouse 清洗数据，周报耗时压缩 92%'
  );

  const addedText = segs
    .filter((s) => s.kind === 'added')
    .map((s) => s.text)
    .join('');
  const removedText = segs
    .filter((s) => s.kind === 'removed')
    .map((s) => s.text)
    .join('');
  const reconstructedBase = segs
    .filter((s) => s.kind !== 'added')
    .map((s) => s.text)
    .join('');
  const reconstructedTarget = segs
    .filter((s) => s.kind !== 'removed')
    .map((s) => s.text)
    .join('');

  assert.equal(reconstructedBase, '使用 SQL 清洗数据，周报耗时压缩 85%');
  assert.equal(reconstructedTarget, '使用 SQL 与 ClickHouse 清洗数据，周报耗时压缩 92%');
  assert.ok(addedText.includes('ClickHouse'));
  assert.ok(addedText.includes('92%'));
  assert.ok(removedText.includes('85%'));

  const slashSegs = diffTextSegments('擅长 SQL/Python 自动化', '擅长 SQL/ClickHouse/Python 自动化');
  const slashRemoved = slashSegs.filter((s) => s.kind === 'removed').map((s) => s.text).join('');
  const slashAdded = slashSegs.filter((s) => s.kind === 'added').map((s) => s.text).join('');
  assert.equal(slashRemoved, '');
  assert.ok(slashAdded.includes('ClickHouse'));
});

test('compareResumeVersions reports zero changes when comparing identical versions', () => {
  const docA = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const docB = cloneResumeDoc(DEFAULT_RESUMES[0]);
  docB.id = 'copy-identical';
  docB.name = '副本';

  const report = compareResumeVersions(docA, docB);
  assert.equal(report.sameDoc, false);
  assert.equal(report.hasChanges, false);
  assert.equal(report.addedChars, 0);
  assert.equal(report.removedChars, 0);
  assert.equal(report.changedSectionsCount, 0);
  assert.equal(report.charDelta, 0);
});

test('compareResumeVersions tracks targeted edits across headline, bullets, tags, and quantified metrics', () => {
  const base = cloneResumeDoc(DEFAULT_RESUMES[0]);
  const edited = cloneResumeDoc(DEFAULT_RESUMES[0]);
  edited.id = 'edited-v2';
  edited.name = '精修投递版';

  edited.data.basic.headline = '资深商业数据分析师 | 擅长 SQL/ClickHouse 自动化治理与增长归因';
  edited.data.experience[0].bullets.push('**经营指标体系**：搭建 15 个核心业务指标口径词典，跨部门对齐效率提升 40%。');
  edited.data.tags = edited.data.tags.filter((t) => t !== '零售进销存');
  edited.data.tags.push('增长归因');
  edited.meta.theme = 'forest-green';

  const report = compareResumeVersions(base, edited);
  assert.equal(report.hasChanges, true);
  assert.ok(report.addedChars > 0);
  assert.ok(report.removedChars > 0);
  assert.ok(report.targetQuantCount > report.baseQuantCount);
  assert.ok(report.styleChanges.some((c) => c.includes('主题色')));

  const basicSec = report.sections.find((s) => s.moduleKey === 'basic');
  assert.equal(basicSec?.status, 'modified');

  const expSec = report.sections.find((s) => s.moduleKey === 'experience');
  assert.equal(expSec?.status, 'modified');
  const addedBullet = expSec?.fields.find((f) => f.status === 'added');
  assert.ok(addedBullet, 'should detect newly added experience bullet');
  assert.ok(addedBullet.segments.some((s) => s.kind === 'added' && s.text.includes('40%')));

  const tagsSec = report.sections.find((s) => s.moduleKey === 'tags');
  assert.equal(tagsSec?.status, 'modified');
  assert.ok(tagsSec?.fields[0].segments.some((s) => s.kind === 'removed' && s.text.includes('零售进销存')));
  assert.ok(tagsSec?.fields[0].segments.some((s) => s.kind === 'added' && s.text.includes('增长归因')));

  // Unchanged modules remain unchanged
  const eduSec = report.sections.find((s) => s.moduleKey === 'education');
  assert.equal(eduSec?.status, 'unchanged');
});

test('compareResumeVersions compares two distinct starter resumes cleanly and counts quantified metrics', () => {
  const report = compareResumeVersions(DEFAULT_RESUMES[0], DEFAULT_RESUMES[1]);
  assert.equal(report.hasChanges, true);
  assert.ok(report.changedSectionsCount >= 4);
  assert.ok(report.styleChanges.length >= 1);
  assert.ok(countQuantifiedMetrics(DEFAULT_RESUMES[0]) >= 5);
});
