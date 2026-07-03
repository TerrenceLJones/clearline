// Header format used in this repo: an optional ticket prefix (e.g. "US-CW-001",
// "CW-000", "PLATFORM-001") followed by a Conventional Commits header, e.g.:
//   US-CW-001 feat: implement user login for clearline-web
//   fix: resolve pnpm version conflict in GitHub Actions workflows
module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      headerPattern: /^(?:[A-Z]{2,}(?:-[A-Z]{2,})*-\d+\s)?(\w+)(?:\(([\w$.\-*/ ]*)\))?!?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
};
