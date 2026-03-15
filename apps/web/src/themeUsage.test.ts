import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const themedSurfaceFiles = [
  'src/pages/RetrospectiveCreatePage.tsx',
  'src/pages/RetrospectiveDetailPage.tsx',
  'src/components/WritingPromptEditorModal.tsx',
  'src/pages/MembersPage.tsx',
  'src/components/AccountabilitySummary.tsx',
  'src/pages/AuditLogPage.tsx',
  'src/pages/AdminPage.tsx',
  'src/pages/ProfilePage.tsx',
];

describe('themed surface usage', () => {
  it('does not use raw Chakra default color schemes on curated surfaces', () => {
    const banned = /\bcolorScheme="(gray|green|orange|red|yellow|teal|blue|cyan|purple|pink|linkedin|facebook|twitter|telegram|messenger|whatsapp)"\b/g;
    const here = dirname(fileURLToPath(import.meta.url));

    for (const relativePath of themedSurfaceFiles) {
      const contents = readFileSync(resolve(here, relativePath.replace(/^src\//, '')), 'utf8');
      expect(contents, `${relativePath} should use themed leaf/clay tokens instead of Chakra defaults`).not.toMatch(banned);
    }
  });
});
