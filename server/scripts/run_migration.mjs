import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('错误: 缺少SUPABASE_URL或SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 从SUPABASE_URL提取项目ID
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
console.log('项目ID:', projectRef);

// 构建连接字符串
// 方案1: 直接连接（不验证SSL）
const directConnString = `postgresql://postgres:${encodeURIComponent(serviceRoleKey)}@db.${projectRef}.supabase.co:5432/postgres?sslmode=no-verify`;

// 方案2: 连接池（Session模式，不验证SSL）
const poolerConnString = `postgresql://postgres.${projectRef}:${encodeURIComponent(serviceRoleKey)}@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=no-verify`;

// 方案3: 连接池（Transaction模式，不验证SSL）
const txConnString = `postgresql://postgres.${projectRef}:${encodeURIComponent(serviceRoleKey)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=no-verify`;

async function testConnection(label, connString) {
  const client = new pg.Client({ connectionString: connString, connectionTimeoutMillis: 10000 });
  try {
    console.log(`\n尝试: ${label}...`);
    await client.connect();
    console.log(`✓ ${label} 连接成功`);
    const res = await client.query('SELECT current_database(), current_user, version()');
    console.log(`  数据库: ${res.rows[0].current_database}`);
    console.log(`  用户: ${res.rows[0].current_user}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`✗ ${label} 失败: ${err.message}`);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function main() {
  console.log('测试Supabase数据库连接...\n');
  
  // 测试所有连接方式
  let workingConnString = null;
  
  if (await testConnection('直接连接', directConnString)) {
    workingConnString = directConnString;
  } else if (await testConnection('连接池Session', poolerConnString)) {
    workingConnString = poolerConnString;
  } else if (await testConnection('连接池Transaction', txConnString)) {
    workingConnString = txConnString;
  }
  
  if (!workingConnString) {
    console.log('\n所有连接方式都失败了。');
    console.log('需要Supabase数据库密码。请在Supabase Dashboard获取数据库连接字符串:');
    console.log('1. 登录 https://app.supabase.com');
    console.log('2. 进入项目 → Settings → Database');
    console.log('3. 复制 Connection string');
    process.exit(1);
  }
  
  console.log(`\n使用连接方式执行迁移...`);
  
  // 读取SQL文件
  const sqlPath = path.join(__dirname, '..', 'output', 'supabase_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log(`SQL文件大小: ${sql.length} 字符`);
  
  const client = new pg.Client({ connectionString: workingConnString });
  try {
    await client.connect();
    console.log('开始执行迁移SQL...');
    const start = Date.now();
    await client.query(sql);
    const elapsed = Date.now() - start;
    console.log(`✓ 迁移执行成功 (${elapsed}ms)`);
    
    // 验证表是否创建
    const tables = ['search_history', 'research_reports', 'investment_theses'];
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) as exists`,
        [table]
      );
      console.log(`  表 ${table}: ${result.rows[0].exists ? '✓ 已创建' : '✗ 未找到'}`);
    }
    
    await client.end();
  } catch (err) {
    console.error(`✗ 迁移失败: ${err.message}`);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

main().catch(err => {
  console.error('执行错误:', err);
  process.exit(1);
});