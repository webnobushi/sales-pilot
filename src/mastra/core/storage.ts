import { LibSQLStore } from "@mastra/libsql";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// 共通のストレージ
export const sharedStorage = new LibSQLStore({
  url: `file:${join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.mastra', 'mastra.db')}`,
});
