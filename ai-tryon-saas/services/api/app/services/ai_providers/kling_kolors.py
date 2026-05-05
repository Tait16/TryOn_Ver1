import time
from dataclasses import dataclass
from typing import Any

import httpx
from jose import jwt


class KlingKolorsError(RuntimeError):
    """Raised when Kling/Kolors returns an invalid or failed response."""


@dataclass(frozen=True)
class KlingKolorsSubmitResult:
    task_id: str
    status: str
    raw: dict[str, Any]


@dataclass(frozen=True)
class KlingKolorsFetchResult:
    status: str
    result_image_url: str | None = None
    error_message: str | None = None
    raw: dict[str, Any] | None = None


class KlingKolorsProvider:
    """Small client for Kling Kolors Virtual Try-On.

    Important:
    - Never call this provider from frontend code. Keep Access Key and Secret Key on the backend.
    - For real Kling requests, human_image and cloth_image should be public http(s) URLs.
    - Localhost URLs and data:image URLs are not reachable by Kling cloud servers.
    """

    def __init__(
        self,
        access_key: str,
        secret_key: str,
        base_url: str = "https://api-singapore.klingai.com",
        model_name: str = "kolors-virtual-try-on-v1-5",
        timeout_seconds: float = 60.0,
    ) -> None:
        self.access_key = access_key
        self.secret_key = secret_key
        self.base_url = base_url.rstrip("/")
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds

    def _make_token(self) -> str:
        now = int(time.time())
        payload = {
            "iss": self.access_key,
            "exp": now + 1800,
            "nbf": now - 5,
        }
        return jwt.encode(payload, self.secret_key, algorithm="HS256", headers={"typ": "JWT", "alg": "HS256"})

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._make_token()}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _assert_public_http_image_url(value: str, field_name: str) -> None:
        normalized = value.strip().lower()
        if not (normalized.startswith("http://") or normalized.startswith("https://")):
            raise KlingKolorsError(f"{field_name} must be a public http(s) image URL for Kling Kolors.")
        if "localhost" in normalized or "127.0.0.1" in normalized:
            raise KlingKolorsError(f"{field_name} cannot be localhost because Kling cannot access your local machine.")

    def submit_tryon(
        self,
        *,
        human_image_url: str,
        cloth_image_url: str,
        callback_url: str | None = None,
    ) -> KlingKolorsSubmitResult:
        self._assert_public_http_image_url(human_image_url, "human_image_url")
        self._assert_public_http_image_url(cloth_image_url, "cloth_image_url")

        payload: dict[str, Any] = {
            "model_name": self.model_name,
            "human_image": human_image_url,
            "cloth_image": cloth_image_url,
        }
        if callback_url:
            payload["callback_url"] = callback_url

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                f"{self.base_url}/kling/v1/images/kolors-virtual-try-on",
                headers=self._headers(),
                json=payload,
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise KlingKolorsError(f"Kling returned non-JSON response: HTTP {response.status_code}") from exc

        if response.status_code >= 400:
            raise KlingKolorsError(_extract_kling_error(data, response.status_code))

        task_data = data.get("data") or {}
        task_id = task_data.get("task_id")
        if not task_id:
            raise KlingKolorsError(f"Kling response did not include task_id: {data}")

        return KlingKolorsSubmitResult(
            task_id=str(task_id),
            status=str(task_data.get("task_status") or "submitted"),
            raw=data,
        )

    def get_tryon_result(self, *, task_id: str) -> KlingKolorsFetchResult:
        if not task_id:
            raise KlingKolorsError("task_id is required")

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                f"{self.base_url}/kling/v1/images/kolors-virtual-try-on/{task_id}",
                headers=self._headers(),
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise KlingKolorsError(f"Kling returned non-JSON response: HTTP {response.status_code}") from exc

        if response.status_code >= 400:
            raise KlingKolorsError(_extract_kling_error(data, response.status_code))

        task_data = data.get("data") or {}
        task_status = str(task_data.get("task_status") or "").lower()
        status_message = str(task_data.get("task_status_msg") or "")

        if task_status == "succeed":
            images = (task_data.get("task_result") or {}).get("images") or []
            result_url = images[0].get("url") if images and isinstance(images[0], dict) else None
            if not result_url:
                return KlingKolorsFetchResult(
                    status="failed",
                    error_message="Kling task succeeded but did not return an image URL.",
                    raw=data,
                )
            return KlingKolorsFetchResult(status="completed", result_image_url=result_url, raw=data)

        if task_status in {"failed", "fail", "error"}:
            return KlingKolorsFetchResult(
                status="failed",
                error_message=status_message or "Kling Kolors try-on failed.",
                raw=data,
            )

        return KlingKolorsFetchResult(status="processing", raw=data)


def _extract_kling_error(data: dict[str, Any], status_code: int) -> str:
    message = data.get("message") or data.get("msg") or data.get("detail")
    if not message and isinstance(data.get("error"), dict):
        message = data["error"].get("message") or data["error"].get("detail") or data["error"].get("brief")
    return str(message or f"Kling API request failed with HTTP {status_code}")
