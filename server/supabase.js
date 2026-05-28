/**
 * Supabase 数据库操作
 *
 * 为向后兼容，此文件重新导出所有 db/ 模块。
 * 新代码建议直接导入 server/db/ 下的具体模块：
 *
 *   import { getSupabaseConfig, supabaseRequest } from './db/client.js';
 *   import { saveAnalysis } from './db/analyses.js';
 *   import { saveSearchHistory } from './db/searchHistory.js';
 */

export { getSupabaseConfig, supabaseRequest } from "./db/client.js";
export {
  ensureTablesExist,
  saveAnalysis,
  getAnalysisHistory,
  getAllAnalyses,
  getRecentAnalyses,
  deleteAnalysis,
  clearAllAnalyses
} from "./db/analyses.js";
export {
  saveSearchHistory,
  getSearchHistory,
  deleteSearchHistory,
  clearAllSearchHistory
} from "./db/searchHistory.js";
export {
  saveResearchReport,
  getResearchReports,
  deleteResearchReport
} from "./db/researchReports.js";
export {
  saveInvestmentThesis,
  getInvestmentTheses,
  updateThesisStatus,
  deleteInvestmentThesis
} from "./db/investmentTheses.js";