import SiteShell from "@/components/SiteShell";

export default function ReportNotFound() {
  return (
    <SiteShell>
      <section className="card pay-result">
        <h2>리포트를 찾을 수 없습니다</h2>
        <p>링크가 잘렸거나 잘못 복사됐을 수 있습니다. 결제 후 받은 메일의 링크를 다시 눌러 보세요.</p>
        <a className="btn-secondary link-btn" href="/">처음으로</a>
      </section>
    </SiteShell>
  );
}
