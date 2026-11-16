import { AppText } from './AppText';
import { LiveRegion } from './LiveRegion';

type Props = {
  /** 입력 칸의 aria-describedby·aria-errormessage가 가리키는 id입니다. */
  id: string;
  message: string;
};

/** 입력 칸 아래의 오류 문구입니다. 알림 영역은 처음부터 두고 문구만 바꿉니다. */
export function FieldError({ id, message }: Props) {
  return (
    <LiveRegion role="alert">
      {message ? <AppText nativeID={id} variant="caption" tone="danger">{message}</AppText> : null}
    </LiveRegion>
  );
}
