# FlyRank Embeddable Widget Platform — Design

## 1. Problem

Build a platform that allows a widget owner to create an embeddable
signup/contact/CTA widget and install it on an external website using
a single script tag.

The public submission API must treat all browser input as untrusted.

## 2. Architecture

There are three main request paths.

### Widget owner

Owner
→ Authenticated Widget Management API
→ Tenant-isolated Database

The owner can create, read, update, and delete widgets and view
their submissions and analytics.

### Customer website

Customer Website
→ GET /widget.js?id=123
→ GET /widgets/:id/config
→ Render Widget

The widget script and configuration are public and cached.

### Website visitor

Visitor
→ POST /submissions
→ CORS
→ Validation
→ Rate Limiting
→ Spam Protection
→ Geo Enrichment
→ Database
→ Email/Webhook

Geo enrichment uses Provider A first and Provider B as a fallback.
If both providers fail, the submission still succeeds.

Email/webhook is a non-critical side effect. If it fails, the
submission must still remain successful.

## 3. Widget model

A widget contains:

- id
- tenant_id
- type
- title
- description
- form fields
- button text
- display options
- created_at
- updated_at

Widgets belong to one tenant.

A tenant can only access its own widgets.

## 4. Submission model

A submission contains:

- id
- widget_id
- tenant_id
- submitted form data
- visitor IP information as appropriate
- geographic information when available
- created_at

Submissions are linked to both the widget and tenant so that
tenant isolation can be enforced.

Indexes will be added for commonly queried fields such as
tenant_id, widget_id, and created_at.

## 5. API surface

### Authenticated widget management

POST   /widgets
GET    /widgets
GET    /widgets/:id
PUT    /widgets/:id
DELETE /widgets/:id

### Public widget delivery

GET    /widget.js
GET    /widgets/:id/config

### Public submission

OPTIONS /submissions
POST    /submissions

### Dashboard

GET    /dashboard/submissions
GET    /dashboard/stats
GET    /dashboard/widgets/:id/stats

## 6. Security boundaries

All public input is considered untrusted.

The submission endpoint will:

1. Handle CORS and preflight requests.
2. Validate the request body.
3. Reject malformed or oversized input.
4. Apply rate limiting.
5. Apply spam protection.
6. Enrich the submission when possible.
7. Store only validated data.
8. Run non-critical side effects after storage.

Failures in geo providers or email/webhook delivery must not turn
a valid submission into a failed request.

## 7. Explicit non-goal

This project will not attempt to become a full form-builder or
production CDN platform.

The widget UI will remain intentionally simple. The main focus is
the backend architecture, security boundaries, CORS, abuse
protection, enrichment fallback, storage, and dashboard APIs.

## 8. Local development

The API will run on localhost.

The customer website will run from a different local origin/port
to prove that cross-origin requests work.