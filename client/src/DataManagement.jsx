import { Database, Trash2 } from "lucide-react";
import { RiskBadge } from "./components/common/Badges.jsx";

export default function DataManagement({
  dataTab, searchHistory, researchReports, investmentTheses, deletingId,
  onTabChange, onDeleteRecord, onClearAll
}) {
  return (
    <section className="data-mgmt">
      <div className="card data-mgmt-card">
        <div className="card-header">
          <h2><Database size={18} /> 数据管理</h2>
          <div className="data-tabs">
            <button
              className={dataTab === "searchHistory" ? "tab active" : "tab"}
              onClick={() => onTabChange("searchHistory")}
            >
              搜索历史
            </button>
            <button
              className={dataTab === "researchReports" ? "tab active" : "tab"}
              onClick={() => onTabChange("researchReports")}
            >
              研判报告
            </button>
            <button
              className={dataTab === "investmentTheses" ? "tab active" : "tab"}
              onClick={() => onTabChange("investmentTheses")}
            >
              投资论点
            </button>
          </div>
        </div>

        {/* Search History */}
        {dataTab === "searchHistory" && (
          <div className="data-table-wrap">
            {searchHistory.length > 0 ? (
              <>
                <button className="btn-clearall" onClick={() => onClearAll("searchHistory")}>
                  清空全部
                </button>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>搜索词</th>
                      <th>市场</th>
                      <th>结果数</th>
                      <th>时间</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchHistory.map((r) => (
                      <tr key={r.id}>
                        <td>{r.query || "--"}</td>
                        <td>{r.market || "--"}</td>
                        <td>{r.result_count ?? "--"}</td>
                        <td>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                        <td>
                          <button
                            className="btn-row-delete"
                            onClick={() => onDeleteRecord("searchHistory", r.id)}
                            disabled={deletingId === r.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="empty-state">点击"搜索历史"标签加载数据</div>
            )}
          </div>
        )}

        {/* Research Reports */}
        {dataTab === "researchReports" && (
          <div className="data-table-wrap">
            {researchReports.length > 0 ? (
              <>
                <button className="btn-clearall" onClick={() => onClearAll("researchReports")}>
                  清空全部
                </button>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>股票</th>
                      <th>板块</th>
                      <th>推荐</th>
                      <th>时间</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {researchReports.map((r) => (
                      <tr key={r.id}>
                        <td>{r.symbol || "--"}</td>
                        <td>{r.sector || "--"}</td>
                        <td><RiskBadge value={r.recommendation} /></td>
                        <td>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                        <td>
                          <button
                            className="btn-row-delete"
                            onClick={() => onDeleteRecord("researchReports", r.id)}
                            disabled={deletingId === r.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="empty-state">点击"研判报告"标签加载数据</div>
            )}
          </div>
        )}

        {/* Investment Theses */}
        {dataTab === "investmentTheses" && (
          <div className="data-table-wrap">
            {investmentTheses.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>股票</th>
                    <th>场景</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {investmentTheses.map((r) => (
                    <tr key={r.id}>
                      <td>{r.symbol || "--"}</td>
                      <td>{r.scenario || "--"}</td>
                      <td><span className={`badge thesis-${(r.status || "").toLowerCase()}`}>{r.status}</span></td>
                      <td>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                      <td>
                        <button
                          className="btn-row-delete"
                          onClick={() => onDeleteRecord("investmentTheses", r.id)}
                          disabled={deletingId === r.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">点击"投资论点"标签加载数据</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}