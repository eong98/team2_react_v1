import { useEffect, useState } from "react";
import { PageHeader } from "../../../components/ui";
import type { ShopPlanTypes } from "../../../components/ts/ShopPlan";
import { axiosInstance } from "../../../utils/Tool";


export default function ShopPlan() {
  /* API 데이터 저장 */
  const [planList, setPlanList] = useState<ShopPlanTypes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  
  useEffect(() => {
    axiosInstance.get(`/shop_plan/list/admin`)
      .then(result => result.data)
      .then((data) => {
        setPlanList(data);
        console.log('-> data:', data);
      })
      .catch(err => console.error(err));
  }, []);

  
  return (
    <section className="view active">
      <PageHeader title="구독 플랜" title_size="xlg" description="매장 규모에 맞는 구독 플랜을 선택하세요." />

      <form >
        <div className="plan_grid">
          <div className="card plan_card">
            <span className="reco_tag">추천</span>

            <h3 className="title lg">프로</h3>
            <div className="price">
              <span className="mono">129,000</span>
              <span className="b_title sm">원</span>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}