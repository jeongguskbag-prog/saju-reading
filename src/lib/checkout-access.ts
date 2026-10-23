// 지금 화면을 보는 사람이 관리자(관리 화면에 로그인한 브라우저)인지. 테스트 결제는 관리자에게만 연다(서버 전용).
import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkAdminSession } from "./admin";

export async function isAdminViewer(): Promise<boolean> {
  try {
    return checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
  } catch {
    return false;
  }
}
