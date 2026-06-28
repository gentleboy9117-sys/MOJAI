// =====================================================================
// 검찰발표자료 레퍼런스 수집 Provider 추상화
//  * 공개 발표자료(스타일 레퍼런스)만 수집한다.
//  * 본문은 '형식 참고'용이며, 초안 생성 시 사실은 차용하지 않는다.
// =====================================================================

/** 수집된 원본 레퍼런스 (PressReleaseReference 모델과 정합) */
export interface RawPressReference {
  title: string;
  officeName?: string;
  publishedAt?: Date;
  sourceUrl: string;
  listPageUrl?: string;
  viewCount?: number;
  markdownContent?: string;
  plainText?: string;
  attachmentUrls?: string[];
  attachmentTypes?: string[];
  contentHash: string;
}

export interface PressReleaseProvider {
  readonly name: string;
  /** 목록 페이지에서 상세 항목들을 수집 */
  collectList(limit: number): Promise<RawPressReference[]>;
  /** 단일 상세 URL 수집(부분 필드) */
  collectDetail(url: string): Promise<Partial<RawPressReference>>;
}
