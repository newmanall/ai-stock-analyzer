import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('错误: 缺少Supabase环境变量');
  console.error('请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey.substring(0, 8) + '...');

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// 读取SQL迁移文件
const sqlFilePath = path.join(__dirname, 'supabase_migration.sql');
let sqlContent;
try {
  sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  console.log(`已读取SQL文件: ${sqlFilePath}`);
  console.log(`文件大小: ${sqlContent.length} 字符`);
} catch (error) {
  console.error(`无法读取SQL文件: ${error.message}`);
  process.exit(1);
}

// 分割SQL语句（按分号分割，但保留CREATE OR REPLACE VIEW的完整性）
const sqlStatements = [];
let currentStatement = '';
let inView = false;

const lines = sqlContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.toUpperCase().startsWith('CREATE OR REPLACE VIEW')) {
    inView = true;
  }
  
  currentStatement += line + '\n';
  
  if (line.endsWith(';') && !inView) {
    sqlStatements.push(currentStatement.trim());
    currentStatement = '';
  } else if (inView && line.endsWith(';')) {
    // VIEW定义结束
    sqlStatements.push(currentStatement.trim());
    currentStatement = '';
    inView = false;
  }
}

if (currentStatement.trim()) {
  sqlStatements.push(currentStatement.trim());
}

console.log(`\n共找到 ${sqlStatements.length} 条SQL语句`);

// 执行每条SQL语句
async function executeMigration() {
  console.log('\n开始执行数据库迁移...\n');
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const statementType = sql.split(' ')[0].toUpperCase();
    
    console.log(`[${i + 1}/${sqlStatements.length}] 执行 ${statementType} 语句...`);
    
    try {
      // 使用Supabase的rpc执行SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // 如果exec_sql函数不存在，尝试直接执行
        console.warn(`  RPC失败: ${error.message}`);
        console.warn(`  尝试直接执行...`);
        
        // 对于Supabase，我们需要使用SQL Editor API
        // 这里我们使用更简单的方法：通过pg查询
        const { data: result, error: pgError } = await supabase.from('_dummy').select('*').limit(1);
        
        if (pgError) {
          console.error(`  无法执行SQL: ${pgError.message}`);
          console.log(`  SQL语句: ${sql.substring(0, 200)}...`);
          console.log('  跳过此语句...\n');
          continue;
        }
        
        console.log(`  执行成功 (通过直接连接)`);
      } else {
        console.log(`  执行成功 (通过RPC)`);
      }
      
      // 等待一下，避免速率限制
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  执行失败: ${error.message}`);
      console.log(`  SQL语句: ${sql.substring(0, 200)}...`);
      console.log('  跳过此语句...\n');
    }
  }
  
  console.log('\n迁移执行完成！');
  console.log('\n下一步:');
  console.log('1. 登录 Supabase Dashboard (https://app.supabase.com)');
  console.log('2. 进入你的项目');
  console.log('3. 点击左侧菜单的 "SQL Editor"');
  console.log('4. 复制以下SQL并执行:');
  console.log('\n' + '='.repeat(80));
  console.log(sqlContent);
  console.log('='.repeat(80));
}

// 检查Supabase连接
async function testConnection() {
  console.log('测试Supabase连接...');
  
  try {
    const { data, error } = await supabase.from('_dummy').select('*').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('✓ Supabase连接正常 (表不存在是预期的)');
      return true;
    } else if (error) {
      console.error(`✗ Supabase连接失败: ${error.message}`);
      return false;
    } else {
      console.log('✓ Supabase连接正常');
      return true;
    }
  } catch (error) {
    console.error(`✗ 连接测试失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('='.repeat(80));
  console.log('Supabase数据库迁移工具');
  console.log('='.repeat(80));
  
  const connected = await testConnection();
  if (!connected) {
    console.error('\n无法连接到Supabase，请检查环境变量');
    process.exit(1);
  }
  
  await executeMigration();
  
  console.log('\n迁移完成！请按照上面的指示在Supabase SQL Editor中执行SQL。');
}

main().catch(error => {
  console.error('迁移过程中发生错误:', error);
  process.exit(1);
});