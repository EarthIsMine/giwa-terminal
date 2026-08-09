import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isOptionalAssetLinkValid,
  normalizeAssetLink,
  normalizeAssetLinks,
} from "../src/asset-links.ts";

test("normalizeAssetLink: website 는 HTTP(S) URL만 허용한다", () => {
  assert.equal(normalizeAssetLink("website", "https://example.com/a"), "https://example.com/a");
  assert.equal(normalizeAssetLink("website", "http://example.com/a"), "http://example.com/a");
  assert.equal(normalizeAssetLink("website", "javascript:alert(1)"), null);
  assert.equal(normalizeAssetLink("website", "not a valid url"), null);
});

test("normalizeAssetLink: X 링크는 x.com 또는 twitter.com 호스트만 허용한다", () => {
  assert.equal(normalizeAssetLink("x", "https://x.com/Naru_giwa"), "https://x.com/Naru_giwa");
  assert.equal(
    normalizeAssetLink("x", "https://twitter.com/Naru_giwa"),
    "https://twitter.com/Naru_giwa",
  );
  assert.equal(normalizeAssetLink("x", "https://evil.com/Naru_giwa"), null);
  assert.equal(normalizeAssetLink("x", "https://x.com.evil.com/Naru_giwa"), null);
  assert.equal(normalizeAssetLink("x", "javascript:https://x.com/Naru_giwa"), null);
});

test("normalizeAssetLink: Telegram 링크는 t.me 호스트만 허용한다", () => {
  assert.equal(
    normalizeAssetLink("telegram", "https://t.me/Naru_giwa"),
    "https://t.me/Naru_giwa",
  );
  assert.equal(normalizeAssetLink("telegram", "https://telegram.org/Naru_giwa"), null);
  assert.equal(normalizeAssetLink("telegram", "https://t.me.evil.com/Naru_giwa"), null);
});

test("isOptionalAssetLinkValid: 빈 값은 선택 필드로 허용한다", () => {
  assert.equal(isOptionalAssetLinkValid("website", ""), true);
  assert.equal(isOptionalAssetLinkValid("x", "   "), true);
  assert.equal(isOptionalAssetLinkValid("telegram", "not a valid url"), false);
});

test("normalizeAssetLinks: 안전한 링크만 남긴다", () => {
  assert.deepEqual(
    normalizeAssetLinks({
      website: "https://example.com",
      x: "https://evil.com/Naru_giwa",
      telegram: "https://t.me/Naru_giwa",
    }),
    {
      website: "https://example.com/",
      telegram: "https://t.me/Naru_giwa",
    },
  );
});
