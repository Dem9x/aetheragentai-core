import next from "eslint-config-next";

const config = [
  { ignores: ["typechain-types/**", "artifacts/**", "cache/**", "coverage/**"] },
  ...next
];

export default config;
