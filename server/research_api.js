import express from 'express';
import {
  saveSearchHistory,
  getSearchHistory,
  deleteSearchHistory,
  clearAllSearchHistory
} from './db/searchHistory.js';
import {
  saveResearchReport,
  getResearchReports,
  deleteResearchReport
} from './db/researchReports.js';
import {
  saveInvestmentThesis,
  getInvestmentTheses,
  updateThesisStatus,
  deleteInvestmentThesis
} from './db/investmentTheses.js';
import {
  deleteAnalysis,
  clearAllAnalyses
} from './db/analyses.js';

const router = express.Router();

// ==================== 搜索历史API ====================

// 保存搜索历史
router.post('/search-history', async (req, res) => {
  try {
    const { symbol, name, sector, analysisType, resultCount } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const result = await saveSearchHistory({
      symbol,
      name: name || symbol,
      sector: sector || '',
      analysisType: analysisType || 'screener',
      resultCount: resultCount || 0
    });

    res.json(result);
  } catch (error) {
    console.error('Error saving search history:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取搜索历史
router.get('/search-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await getSearchHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting search history:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除单条搜索历史
router.delete('/search-history/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const result = await deleteSearchHistory(id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting search history:', error);
    res.status(500).json({ error: error.message });
  }
});

// 清空所有搜索历史
router.delete('/search-history', async (req, res) => {
  try {
    const result = await clearAllSearchHistory();
    res.json(result);
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 研判报告API ====================

// 保存研判报告
router.post('/research-reports', async (req, res) => {
  try {
    const { reportId, sector, reportType, content, summary, topPicks } = req.body;
    
    if (!reportId || !sector) {
      return res.status(400).json({ error: 'reportId and sector are required' });
    }

    const result = await saveResearchReport({
      reportId,
      sector,
      reportType: reportType || 'sector_overview',
      content: content || {},
      summary: summary || '',
      topPicks: topPicks || []
    });

    res.json(result);
  } catch (error) {
    console.error('Error saving research report:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取研判报告列表
router.get('/research-reports', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reports = await getResearchReports(limit);
    res.json(reports);
  } catch (error) {
    console.error('Error getting research reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除研判报告
router.delete('/research-reports/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const result = await deleteResearchReport(id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting research report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 投资论点API ====================

// 保存投资论点
router.post('/investment-theses', async (req, res) => {
  try {
    const { 
      symbol, 
      name, 
      thesisStatement, 
      pillars, 
      risks, 
      catalysts, 
      targetPrice, 
      recommendation 
    } = req.body;
    
    if (!symbol || !name) {
      return res.status(400).json({ error: 'symbol and name are required' });
    }

    const result = await saveInvestmentThesis({
      symbol,
      name,
      thesisStatement: thesisStatement || '',
      pillars: pillars || [],
      risks: risks || [],
      catalysts: catalysts || [],
      targetPrice: targetPrice || null,
      recommendation: recommendation || 'hold'
    });

    res.json(result);
  } catch (error) {
    console.error('Error saving investment thesis:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取投资论点列表
router.get('/investment-theses', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || 'active';
    const theses = await getInvestmentTheses(limit);
    
    // 过滤状态
    const filteredTheses = status === 'all' 
      ? theses 
      : theses.filter(t => t.status === status);
    
    res.json(filteredTheses);
  } catch (error) {
    console.error('Error getting investment theses:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新论点状态
router.patch('/investment-theses/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    
    const validStatus = ['active', 'validated', 'invalidated', 'archived'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await updateThesisStatus(id, status);
    res.json(result);
  } catch (error) {
    console.error('Error updating thesis status:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除投资论点
router.delete('/investment-theses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const result = await deleteInvestmentThesis(id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting investment thesis:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 分析记录API ====================

// 删除单条分析记录
router.delete('/analyses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const result = await deleteAnalysis(id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// 清空所有分析记录
router.delete('/analyses', async (req, res) => {
  try {
    const result = await clearAllAnalyses();
    res.json(result);
  } catch (error) {
    console.error('Error clearing analyses:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;