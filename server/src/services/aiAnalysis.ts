import OpenAI from 'openai';
import { AnalysisResult, StockData } from '../types/index.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * 构建股票分析Prompt
 */
function buildPrompt(stock: StockData): string {
  return `
你是一位专业的金融分析师AI。请根据以下股票数据进行分析，并严格按照要求的JSON格式返回结果。

## 重要规则
1. 只返回纯JSON，不要有任何Markdown标记、解释文字或额外内容
2. JSON必须包含以下字段：summary, sentiment, risk_level, confidence_score
3. sentiment只能是：Bullish, Neutral, Bearish 之一
4. risk_level只能是：Low, Medium, High, Critical 之一
5. confidence_score是0.00-1.00之间的数字

## 股票数据
股票代码: ${stock.symbol}
股票名称: ${stock.name || '未知'}
当前价格: $${stock.currentPrice.toFixed(2)}
24小时涨跌幅: ${stock.priceChangePercent.toFixed(2)}%
成交量: ${stock.volume.toLocaleString()}
市值: $${(stock.marketCap / 1e9).toFixed(2)}B
行业: ${stock.industry || '未知'}

## 分析要求
1. summary: 用100-150字总结股票当前状况和趋势
2. sentiment: 基于数据判断市场情绪
3. risk_level: 评估投资风险等级
4. confidence_score: 你对分析结果的置信度

## 输出格式 (严格遵守)
{
  "summary": "字符串",
  "sentiment": "Bullish|Neutral|Bearish",
  "risk_level": "Low|Medium|High|Critical",
  "confidence_score": 0.00
}

现在请分析并返回JSON：
`;
}

/**
 * 从LLM响应中提取JSON
 */
function extractJson(text: string): AnalysisResult {
  // 尝试直接解析
  try {
    const parsed = JSON.parse(text);
    validateAnalysisResult(parsed);
    return parsed;
  } catch {
    // 尝试提取JSON代码块
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        validateAnalysisResult(parsed);
        return parsed;
      } catch {
        // 尝试修复常见JSON问题
        const fixed = fixJson(text);
        if (fixed) {
          const parsed = JSON.parse(fixed);
          validateAnalysisResult(parsed);
          return parsed;
        }
      }
    }
  }
  
  throw new Error('无法解析AI返回的JSON');
}

/**
 * 验证分析结果
 */
function validateAnalysisResult(data: unknown): asserts data is AnalysisResult {
  if (!data || typeof data !== 'object') {
    throw new Error('无效的JSON格式');
  }
  
  const validSentiments = ['Bullish', 'Neutral', 'Bearish'];
  const validRiskLevels = ['Low', 'Medium', 'High', 'Critical'];
  
  const result = data as Record<string, unknown>;
  
  if (typeof result.summary !== 'string') {
    throw new Error('缺少summary字段');
  }
  
  if (!validSentiments.includes(result.sentiment as string)) {
    throw new Error(`无效的sentiment: ${result.sentiment}`);
  }
  
  if (!validRiskLevels.includes(result.risk_level as string)) {
    throw new Error(`无效的risk_level: ${result.risk_level}`);
  }
  
  if (typeof result.confidence_score !== 'number' || 
      result.confidence_score < 0 || 
      result.confidence_score > 1) {
    throw new Error('confidence_score必须在0-1之间');
  }
}

/**
 * 修复常见JSON问题
 */
function fixJson(text: string): string | null {
  try {
    // 移除可能的Markdown代码块标记
    let fixed = text.replace(/^```json\s*/i, '').replace(/```$/, '');
    
    // 修复未转义的引号（简单处理）
    // 注意：这只是简单修复，复杂情况需要更完善的解析
    
    return fixed.trim();
  } catch {
    return null;
  }
}

/**
 * 调用AI分析股票
 */
export async function analyzeStock(stock: StockData): Promise<AnalysisResult> {
  const prompt = buildPrompt(stock);
  
  console.log(`🤖 调用AI分析: ${stock.symbol}`);
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // 性价比高，支持JSON模式
      response_format: { type: 'json_object' },  // 强制返回JSON
      messages: [
        { 
          role: 'system', 
          content: '你是一个只返回JSON的金融分析API。严格遵守输出格式，不要添加任何额外内容。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,  // 低温度确保输出稳定
      max_tokens: 1000
    });
    
    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('AI返回空响应');
    }
    
    console.log(`✅ AI分析完成: ${stock.symbol}`);
    
    return extractJson(content);
    
  } catch (error) {
    console.error('❌ AI分析失败:', error);
    throw new Error('AI分析服务暂时不可用');
  }
}
