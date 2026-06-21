#!/bin/bash
# HTTP 主流程验证脚本 - 测试实际 API 端点
# 前置条件: 后端服务已启动 (./start-backend.sh)
# 运行方式: bash verify_http.sh

set -e

BASE="http://localhost:8000/api"
PASS=0
FAIL=0

ok()   { echo "  [OK] $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
sep()  { echo "----------------------------------------"; }

sep
echo "  律所案件承接系统 - HTTP 主流程验证"
sep

# 0. 健康检查
echo "步骤 0: 健康检查"
HEALTH=$(curl -s "http://localhost:8000/api/health")
if echo "$HEALTH" | grep -q "ok"; then ok "健康检查通过"; else fail "健康检查失败: $HEALTH"; exit 1; fi

# 1. partner 登录
echo "步骤 1: partner 登录"
LOGIN_RESP=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"partner","password":"123456"}')
PARTNER_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [ -n "$PARTNER_TOKEN" ] && [ "$PARTNER_TOKEN" != "" ]; then
  ok "partner 登录成功, token 已获取"
else
  fail "partner 登录失败: $LOGIN_RESP"; exit 1
fi

# 验证 /auth/me
ME_RESP=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $PARTNER_TOKEN")
ME_ROLE=$(echo "$ME_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('role',''))" 2>/dev/null)
if [ "$ME_ROLE" = "partner" ]; then ok "/auth/me 验证通过 (role=partner)"; else fail "/auth/me 失败: $ME_RESP"; fi

# 2. 登记案件
echo "步骤 2: 登记案件 (partner)"
CASE_RESP=$(curl -s -X POST "$BASE/cases" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -d '{"case_name":"HTTP验证案件","case_type":"民事诉讼","description":"测试","related_parties":[{"name":"对方公司","party_type":"opposing","is_individual":false}]}')
CASE_ID=$(echo "$CASE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
CASE_STATUS=$(echo "$CASE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$CASE_STATUS" = "draft" ]; then ok "案件登记成功 (id=$CASE_ID, status=draft)"; else fail "案件登记失败: $CASE_RESP"; fi

# 3. 提交冲突检查
echo "步骤 3: 提交冲突检查 (partner)"
SUBMIT_RESP=$(curl -s -X POST "$BASE/cases/$CASE_ID/submit-conflict" -H "Authorization: Bearer $PARTNER_TOKEN")
SUBMIT_STATUS=$(echo "$SUBMIT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$SUBMIT_STATUS" = "pending" ]; then ok "提交冲突检查成功 (status=pending)"; else fail "提交失败: $SUBMIT_RESP"; fi

# 4. 风控登录 + 给出无冲突结论
echo "步骤 4: 风控登录 + 给出无冲突结论 (risk)"
RISK_LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"username":"risk","password":"123456"}')
RISK_TOKEN=$(echo "$RISK_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [ -n "$RISK_TOKEN" ]; then ok "risk 登录成功"; else fail "risk 登录失败: $RISK_LOGIN"; fi

CONFLICT_RESP=$(curl -s -X POST "$BASE/conflict-checks" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RISK_TOKEN" \
  -d "{\"case_id\":$CASE_ID,\"result\":\"no_conflict\",\"conflict_details\":\"无冲突\",\"risk_suggestion\":\"可承接\"}")
CONFLICT_RESULT=$(echo "$CONFLICT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',''))" 2>/dev/null)
if [ "$CONFLICT_RESULT" = "no_conflict" ]; then ok "冲突检查结论已提交 (no_conflict)"; else fail "冲突检查失败: $CONFLICT_RESP"; fi

CASE_DETAIL=$(curl -s "$BASE/cases/$CASE_ID" -H "Authorization: Bearer $PARTNER_TOKEN")
CASE_STATUS=$(echo "$CASE_DETAIL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$CASE_STATUS" = "conflict_checked" ]; then ok "案件状态已更新 (conflict_checked)"; else fail "案件状态错误: $CASE_STATUS"; fi

# 验证 conflict_check @property 序列化
HAS_CC=$(echo "$CASE_DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('conflict_check') else 'no')" 2>/dev/null)
if [ "$HAS_CC" = "yes" ]; then ok "@property conflict_check 序列化成功"; else fail "conflict_check 序列化失败"; fi

# 5. partner 创建预算 + 财务确认
echo "步骤 5: 财务登录 + 录入并确认预算 (finance)"
FIN_LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"username":"finance","password":"123456"}')
FIN_TOKEN=$(echo "$FIN_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [ -n "$FIN_TOKEN" ]; then ok "finance 登录成功"; else fail "finance 登录失败: $FIN_LOGIN"; fi

BUDGET_RESP=$(curl -s -X POST "$BASE/budgets" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -d "{\"case_id\":$CASE_ID,\"total_amount\":150000,\"advance_payment\":50000,\"payment_terms\":\"分三期\"}")
BUDGET_ID=$(echo "$BUDGET_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$BUDGET_ID" ]; then ok "预算录入成功 (id=$BUDGET_ID)"; else fail "预算录入失败: $BUDGET_RESP"; fi

CONFIRM_RESP=$(curl -s -X POST "$BASE/budgets/$BUDGET_ID/confirm" -H "Authorization: Bearer $FIN_TOKEN")
BUDGET_STATUS=$(echo "$CONFIRM_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$BUDGET_STATUS" = "confirmed" ]; then ok "预算确认成功 (confirmed)"; else fail "预算确认失败: $CONFIRM_RESP"; fi

CASE_DETAIL=$(curl -s "$BASE/cases/$CASE_ID" -H "Authorization: Bearer $PARTNER_TOKEN")
CASE_STATUS=$(echo "$CASE_DETAIL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$CASE_STATUS" = "budget_confirmed" ]; then ok "案件状态已更新 (budget_confirmed)"; else fail "案件状态错误: $CASE_STATUS"; fi

# 6. 预算确认后分配律师
echo "步骤 6: 预算确认后分配律师 (partner)"
LAWYER_ID=4
ASSIGN_RESP=$(curl -s -X POST "$BASE/cases/$CASE_ID/assign-lawyer?lawyer_id=$LAWYER_ID" -H "Authorization: Bearer $PARTNER_TOKEN")
ASSIGNED=$(echo "$ASSIGN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('assigned_lawyer_id',''))" 2>/dev/null)
if [ "$ASSIGNED" = "$LAWYER_ID" ]; then ok "律师分配成功 (lawyer_id=$LAWYER_ID)"; else fail "律师分配失败: $ASSIGN_RESP"; fi

# 7. 确认承接 + 归档
echo "步骤 7: 确认承接 + 归档"
ACCEPT_RESP=$(curl -s -X POST "$BASE/cases/$CASE_ID/accept" -H "Authorization: Bearer $PARTNER_TOKEN")
ACCEPT_STATUS=$(echo "$ACCEPT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$ACCEPT_STATUS" = "accepted" ]; then ok "案件已承接 (accepted)"; else fail "承接失败: $ACCEPT_RESP"; fi

# 添加材料
curl -s -X POST "$BASE/materials" -H "Content-Type: application/json" -H "Authorization: Bearer $PARTNER_TOKEN" \
  -d "{\"case_id\":$CASE_ID,\"material_name\":\"委托合同.pdf\",\"material_type\":\"contract\",\"is_supplementary\":false}" > /dev/null
ok "已添加材料: 委托合同.pdf"

ARCHIVE_RESP=$(curl -s -X POST "$BASE/cases/$CASE_ID/archive" -H "Authorization: Bearer $PARTNER_TOKEN")
ARCHIVE_STATUS=$(echo "$ARCHIVE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$ARCHIVE_STATUS" = "archived" ]; then ok "案件已归档 (archived)"; else fail "归档失败: $ARCHIVE_RESP"; fi

# 8. 验证归档后不能改承接结论
echo "步骤 8: 验证归档后不能改承接结论"
UPDATE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/cases/$CASE_ID" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARTNER_TOKEN" -d '{"case_name":"尝试修改"}')
if [ "$UPDATE_CODE" = "400" ]; then ok "归档后修改被拦截 (HTTP 400)"; else fail "归档后修改未被拦截 (HTTP $UPDATE_CODE)"; fi

# 9. 验证归档后只能追加补充材料
echo "步骤 9: 验证归档后只能追加补充材料"
NON_SUPP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/materials" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -d "{\"case_id\":$CASE_ID,\"material_name\":\"非补充.pdf\",\"material_type\":\"other\",\"is_supplementary\":false}")
if [ "$NON_SUPP_CODE" = "400" ]; then ok "非补充材料被拦截 (HTTP 400)"; else fail "非补充材料未被拦截 (HTTP $NON_SUPP_CODE)"; fi

SUPP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/materials" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -d "{\"case_id\":$CASE_ID,\"material_name\":\"补充材料.pdf\",\"material_type\":\"other\",\"is_supplementary\":true,\"description\":\"归档后补充\"}")
if [ "$SUPP_CODE" = "200" ]; then ok "补充材料添加成功 (HTTP 200)"; else fail "补充材料添加失败 (HTTP $SUPP_CODE)"; fi

# 10. 验证直接冲突 -> 禁止立案
echo "步骤 10: 验证直接冲突 -> 禁止立案"
DIRECT_CASE=$(curl -s -X POST "$BASE/cases" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PARTNER_TOKEN" \
  -d '{"case_name":"直接冲突案件","case_type":"民事诉讼","related_parties":[{"name":"本所顾问单位","party_type":"opposing","is_individual":false}]}')
DIRECT_ID=$(echo "$DIRECT_CASE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
curl -s -X POST "$BASE/cases/$DIRECT_ID/submit-conflict" -H "Authorization: Bearer $PARTNER_TOKEN" > /dev/null

DIRECT_CONFLICT=$(curl -s -X POST "$BASE/conflict-checks" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RISK_TOKEN" \
  -d "{\"case_id\":$DIRECT_ID,\"result\":\"direct_conflict\",\"conflict_details\":\"直接利益冲突\"}")
DIRECT_STATUS=$(curl -s "$BASE/cases/$DIRECT_ID" -H "Authorization: Bearer $PARTNER_TOKEN" | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$DIRECT_STATUS" = "rejected" ]; then ok "直接冲突 -> 案件被驳回 (rejected), 禁止立案"; else fail "直接冲突未驳回: $DIRECT_STATUS"; fi

# 总结
sep
echo "  验证结果: $PASS 通过, $FAIL 失败"
sep
if [ "$FAIL" -eq 0 ]; then
  echo "  *** 全部主流程验证通过！ ***"
else
  echo "  !!! 有 $FAIL 项验证失败，请检查 !!!"
  exit 1
fi
