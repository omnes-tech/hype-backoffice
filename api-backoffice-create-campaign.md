# API — Create campaign (Backoffice)

Integration reference for **POST** `/backoffice/campaigns`.

Creates a **draft** campaign. Optionally creates **phases** (campaign steps) in the **same database transaction** as the campaign when `phases` is a non-empty array.

---

## Endpoint

| Item | Value |
|------|--------|
| Method | `POST` |
| Path | `/backoffice/campaigns` |
| Success status | `201 Created` |

Base URL depends on deployment (e.g. `https://<api-host>`). Full URL: `https://<api-host>/backoffice/campaigns`.

---

## Headers (required)

| Header | Value | Notes |
|--------|--------|------|
| `Client-Type` | `backoffice` | Required by API client guard. |
| `Authorization` | `Bearer <access_token>` | User token with backoffice ability. |
| `Workspace-Id` | `<workspace_public_uuid>` | Workspace the campaign belongs to. |
| `Content-Type` | `application/json` | |

---

## Request body

### Campaign fields (always required)

Same schema as a campaign-only create. Field names use **snake_case** in JSON.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Max length 100. |
| `description` | string | yes | |
| `objective` | string | yes | |
| `secondary_niches` | number[] | no | Omit or `[]` to store no secondary niches (`null` in DB). When present, each ID must be a positive integer. |
| `max_influencers` | number | yes | Positive integer. |
| `payment_method` | string | yes | Enum value (see `PaymentMethodEnum` in codebase). |
| `payment_method_details` | object | yes | Structure depends on payment method. |
| `rules_does` | string[] | yes | |
| `rules_does_not` | string[] | yes | |
| `image_rights_period` | number | yes | Integer ≥ 0. |
| `benefits` | string[] \| null | no | |
| `segment_min_followers` | number \| null | no | |
| `segment_state` | string[] \| null | no | |
| `segment_city` | string[] \| null | no | |
| `segment_genders` | string[] \| null | no | Gender enum values. |
| `banner` | string \| null | no | URL or path. |

### Optional: `phases`

| Field | Type | Description |
|-------|------|-------------|
| `phases` | array | Omit or use `[]` to create **only** the campaign. If **one or more** phase objects are sent, each phase is created **after** the campaign insert, in order, inside a **single transaction** (all succeed or all roll back). |

Each phase object matches **Create phase** payload (same rules as **POST** `/backoffice/campaigns/:campaignId/phases`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `objective` | string | yes | |
| `post_date` | string | yes | `YYYY-MM-DD`. First phase: must be at least **10 days** from today; later phases: at least **3 days** after the previous phase’s publish date. |
| `publish_time` | string | no | `HH:MM` or `HH:MM:SS`. Default applied server-side if omitted. |
| `formats` | array | yes | Min length 1. Each item: `type` (string), `options` (array of `{ type, quantity }`). |
| `files` | string[] | no | URLs. |

---

## Responses

### 201 — Campaign only (`phases` omitted, empty, or not sent)

Wrapper matches other backoffice resources:

```json
{
  "data": {
    "id": "<campaign_public_uuid>",
    "title": "...",
    "description": "...",
    "objective": "...",
    "status": { "value": "draft", "label": "..." },
    "...": "..."
  }
}
```

Shape is the **transformed campaign** object from `transformCampaign` (see `src/resources/backoffice/campaign.resource.ts`).

### 201 — Campaign + phases (`phases` is a non-empty array)

```json
{
  "data": {
    "campaign": {
      "id": "<campaign_public_uuid>",
      "title": "...",
      "...": "..."
    },
    "phases": [
      {
        "id": "<phase_public_uuid>",
        "objective": "...",
        "post_date": "YYYY-MM-DD",
        "formats": [ ... ],
        "files": [],
        "created_at": "...",
        "updated_at": "..."
      }
    ]
  }
}
```

### Error responses

| Status | Typical cause |
|--------|----------------|
| `400` | Validation (Portuguese messages in `message` / field errors). Invalid dates for phases, invalid body, etc. |
| `401` | Missing or invalid token. |
| `403` | Missing ability or workspace access. |
| `500` | Server error (generic Portuguese message). |

---

## Behaviour summary

1. **No phases / empty `phases`:** one insert for `campaigns`; automation pipeline hook runs after commit; response is `{ data: <campaign> }`.
2. **With `phases.length >= 1`:** one transaction inserts the campaign then each phase in order; associates step–social networks when formats imply networks; automation pipeline hook after commit; response is `{ data: { campaign, phases } }`.
3. **Still supported:** creating phases later via **POST** `/backoffice/campaigns/:campaignId/phases` if the campaign was created without phases.

---

## Example — campaign + two phases

```http
POST /backoffice/campaigns HTTP/1.1
Host: <api-host>
Client-Type: backoffice
Workspace-Id: <workspace-uuid>
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Summer drop",
  "description": "...",
  "objective": "...",
  "secondary_niches": [1, 2],
  "max_influencers": 10,
  "payment_method": "pix",
  "payment_method_details": {},
  "rules_does": ["rule1"],
  "rules_does_not": ["rule2"],
  "image_rights_period": 12,
  "phases": [
    {
      "objective": "awareness",
      "post_date": "2025-12-15",
      "publish_time": "10:00:00",
      "formats": [
        {
          "type": "instagram",
          "options": [{ "type": "stories", "quantity": 2 }]
        }
      ]
    },
    {
      "objective": "conversion",
      "post_date": "2025-12-22",
      "formats": [
        {
          "type": "tiktok",
          "options": [{ "type": "video", "quantity": 1 }]
        }
      ]
    }
  ]
}
```

---

## Example — campaign only (legacy flow)

Omit `phases` or send `"phases": []`.

```json
{
  "title": "Draft campaign",
  "description": "...",
  "objective": "...",
  "secondary_niches": [1],
  "max_influencers": 5,
  "payment_method": "pix",
  "payment_method_details": {},
  "rules_does": ["x"],
  "rules_does_not": ["y"],
  "image_rights_period": 6
}
```
