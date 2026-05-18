#!/usr/bin/env python3
"""
AI 股票分析面板 - 自动化测试脚本
用于提交前验证功能完整性
"""

import subprocess
import sys
import time
import requests
from pathlib import Path

# 配置
SERVER_URL = "http://localhost:3000"
CLIENT_URL = "http://localhost:5173"
TIMEOUT = 30

# 测试用例
TESTS = []

def test(name):
    """测试装饰器"""
    def decorator(func):
        TESTS.append((name, func))
        return func
    return decorator


@test("1. 后端 TypeScript 编译")
def test_server_build():
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=Path(__file__).parent / "server",
        capture_output=True,
        text=True,
        timeout=60
    )
    if result.returncode != 0:
        print(f"❌ 编译失败:\n{result.stderr}")
        return False
    print("✅ 后端编译成功")
    return True


@test("2. 前端 TypeScript 编译")
def test_client_build():
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=Path(__file__).parent / "client",
        capture_output=True,
        text=True,
        timeout=60
    )
    if result.returncode != 0:
        print(f"❌ 编译失败:\n{result.stderr}")
        return False
    print("✅ 前端编译成功")
    return True


@test("3. 健康检查接口")
def test_health_check():
    try:
        resp = requests.get(f"{SERVER_URL}/api/health", timeout=5)
        if resp.status_code != 200:
            print(f"❌ 状态码: {resp.status_code}")
            return False
        data = resp.json()
        if data.get("status") != "ok":
            print(f"❌ 状态异常: {data}")
            return False
        print(f"✅ 健康检查通过: {data}")
        return True
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False


@test("4. 股票代码分析 (模拟数据)")
def test_analyze_stock():
    try:
        resp = requests.post(
            f"{SERVER_URL}/api/analyze",
            json={"symbol": "AAPL"},
            timeout=60
        )
        if resp.status_code != 200:
            print(f"❌ 状态码: {resp.status_code}")
            print(f"   响应: {resp.text[:200]}")
            return False
        
        data = resp.json()
        if not data.get("success"):
            print(f"❌ 分析失败: {data.get('message')}")
            return False
        
        result = data.get("data", {})
        required_fields = ["summary", "sentiment", "risk_level", "confidence_score"]
        missing = [f for f in required_fields if f not in result]
        if missing:
            print(f"❌ 缺少字段: {missing}")
            return False
        
        # 验证枚举值
        valid_sentiments = ["Bullish", "Neutral", "Bearish"]
        valid_risks = ["Low", "Medium", "High", "Critical"]
        
        if result["sentiment"] not in valid_sentiments:
            print(f"❌ 无效情绪: {result['sentiment']}")
            return False
        
        if result["risk_level"] not in valid_risks:
            print(f"❌ 无效风险等级: {result['risk_level']}")
            return False
        
        if not (0 <= result["confidence_score"] <= 1):
            print(f"❌ 置信度范围错误: {result['confidence_score']}")
            return False
        
        print(f"✅ 分析成功:")
        print(f"   情绪: {result['sentiment']}")
        print(f"   风险: {result['risk_level']}")
        print(f"   置信度: {result['confidence_score']:.2%}")
        return True
        
    except requests.exceptions.Timeout:
        print("❌ 请求超时")
        return False
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False


@test("5. 历史记录接口")
def test_get_history():
    try:
        resp = requests.get(f"{SERVER_URL}/api/history?limit=5", timeout=10)
        if resp.status_code != 200:
            print(f"❌ 状态码: {resp.status_code}")
            return False
        
        data = resp.json()
        if not data.get("success"):
            print(f"❌ 获取失败: {data.get('message')}")
            return False
        
        history = data.get("data", [])
        print(f"✅ 历史记录: {len(history)} 条")
        return True
        
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False


@test("6. 无效股票代码处理")
def test_invalid_symbol():
    try:
        resp = requests.post(
            f"{SERVER_URL}/api/analyze",
            json={"symbol": "INVALID123"},
            timeout=30
        )
        # 应该返回错误，但不能是 500
        if resp.status_code == 500:
            print("❌ 服务器内部错误（应该优雅处理）")
            return False
        print(f"✅ 无效代码已处理 (状态码: {resp.status_code})")
        return True
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False


@test("7. 空请求体处理")
def test_empty_body():
    try:
        resp = requests.post(
            f"{SERVER_URL}/api/analyze",
            json={},
            timeout=10
        )
        if resp.status_code == 500:
            print("❌ 服务器内部错误（应该返回 400）")
            return False
        print(f"✅ 空请求已处理 (状态码: {resp.status_code})")
        return True
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False


def run_tests():
    """运行所有测试"""
    print("=" * 60)
    print("🧪 AI 股票分析面板 - 自动化测试")
    print("=" * 60)
    print()
    
    passed = 0
    failed = 0
    skipped = 0
    
    for name, test_func in TESTS:
        print(f"📋 {name}...", end=" ")
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ 异常: {e}")
            failed += 1
    
    print()
    print("=" * 60)
    print(f"📊 测试结果: {passed} 通过, {failed} 失败, {skipped} 跳过")
    print("=" * 60)
    
    if failed > 0:
        print("\n⚠️  部分测试失败，请检查后再提交")
        return False
    else:
        print("\n✅ 所有测试通过，可以提交")
        return True


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
