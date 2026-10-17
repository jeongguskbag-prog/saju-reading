// 첫 화면(한국어)의 "함께 보는 감정서": 궁합·신년 운세·택일·주역 점·자미두수. 아직 준비 중인 것은 준비 중으로만 보여 준다.
import { EXTRA_ORDER, PRODUCTS, won, withProductYears } from "@/lib/product";

const DETAIL: Record<(typeof EXTRA_ORDER)[number], { hanja: string; how: string }> = {
  gunghap: { hanja: "緣分錄", how: "두 분의 생년월일시를 받아 각각 명식을 세우고, 일간·배우자 자리·띠의 합충과 오행 보완, 대운 동행을 함께 봅니다." },
  newyear: { hanja: "新年錄", how: "고르신 해의 간지를 내 명식과 대운에 겹쳐 보고, 삼재 여부와 열두 달 월운으로 달마다 할 일을 정리합니다." },
  taekil: { hanja: "擇日錄", how: "정한 기간의 날마다 간지를 세워, 의뢰인 사주와의 합충과 전통 길흉일을 함께 따져 좋은 날을 고릅니다." },
  iching: { hanja: "周易占", how: "물음 하나를 받아 시초점의 확률로 여섯 효를 얻고, 본괘·변효·지괘의 괘사와 효사로 풀어 드립니다." },
  ziwei: { hanja: "紫微斗數", how: "음력 생년월일시로 열두 궁에 자미성·천부성 등 별을 배치한 명반을 세우고, 궁마다 풀어 드립니다." },
};

export default function ExtraProducts({ years, checkoutOpen }: { years: [number, number]; checkoutOpen: boolean }) {
  return (
    <div className="lp-extras" id="extras">
      <h3 className="lp-extras-h">함께 보는 감정서</h3>
      <p className="lp-lead">사주 감정서 밖의 전통 술수도 같은 방식으로, 실제 계산에 바탕을 두고 씁니다.</p>
      <div className="lp-products">
        {EXTRA_ORDER.map((id) => {
          const p = PRODUCTS[id];
          return (
            <div key={id} className={`lp-plan${p.available ? "" : " soon"}`}>
              <h3>
                {p.name.replace(/^천기록 /, "")} <small className="lp-hanja">{DETAIL[id].hanja}</small>
              </h3>
              <p className="lp-price">{won(p.price)}</p>
              <p className="lp-plan-sum">{withProductYears(p.summary, years)}</p>
              <p className="lp-plan-parts">{DETAIL[id].how}</p>
              {p.available ? (
                checkoutOpen ? (
                  <a className="lp-cta-ghost" href="#saju-form">
                    내 사주 입력하고 신청하기
                  </a>
                ) : (
                  <p className="lp-soon">결제 준비 중</p>
                )
              ) : (
                <p className="lp-soon">준비 중</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
