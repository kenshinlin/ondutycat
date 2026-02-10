# Dod Platform Database Design

## Overview

This document describes the database schema for the Dod Platform, an AI-powered alert processing system that handles monitoring alerts from various online systems.

## ER Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tenant    │────<│    User     │────<│    Alert    │────<│    Issue    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                    │                                        │
       │                    v                                        v
       v            ┌─────────────┐                          ┌─────────────┐
┌─────────────┐     │   Skill     │                          │IssueAlert   │
│   Config    │     └─────────────┘                          │  Binding    │
│             │            │                                  └─────────────┘
└─────────────┘            v
┌─────────────┐     ┌─────────────┐
│    Tool     │     │AlertSkill   │
└─────────────┘     │  Binding    │
                    └─────────────┘
```

## Tables

### 1. tenants

Multi-tenancy support table.

| Column     | Type         | Constraints            | Description                        |
| ---------- | ------------ | ---------------------- | ---------------------------------- |
| id         | UUID         | PK                     | Unique tenant identifier           |
| name       | VARCHAR(255) | NOT NULL               | Tenant name                        |
| status     | ENUM         | NOT NULL               | Status: active, suspended, deleted |
| created_at | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp                 |
| updated_at | TIMESTAMP    | NOT NULL DEFAULT NOW() | Last update timestamp              |

### 2. users

Platform users table (integrates with Supabase Auth).

| Column        | Type         | Constraints            | Description                                         |
| ------------- | ------------ | ---------------------- | --------------------------------------------------- |
| id            | UUID         | PK                     | Unique user identifier (matches Supabase Auth user_id) |
| tenant_id     | UUID         | FK, NOT NULL           | Reference to tenants.id                             |
| email         | VARCHAR(255) | NOT NULL, UNIQUE       | User email address                                  |
| name          | VARCHAR(255) |                        | Display name                                        |
| avatar_url    | VARCHAR(500) |                        | Profile avatar URL                                  |
| role          | ENUM         | NOT NULL               | Role: admin, member, viewer                        |
| status        | ENUM         | NOT NULL               | Status: active, inactive                           |
| last_sign_in_at | TIMESTAMP  |                        | Last login timestamp                               |
| created_at    | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp                                  |
| updated_at    | TIMESTAMP    | NOT NULL DEFAULT NOW() | Last update timestamp                               |

**Indexes:**

- `idx_users_tenant_id` on (tenant_id)
- `idx_users_email` on (email) UNIQUE
- `idx_users_status` on (status)

**Notes:**

- The `id` field should match Supabase Auth's `user_id` for seamless integration
- Role definitions:
  - `admin`: Full access to all tenant resources
  - `member`: Can manage alerts, issues, skills, tools
  - `viewer`: Read-only access

### 3. alerts

Stores incoming alert records from monitoring systems.

| Column        | Type         | Constraints            | Description                                             |
| ------------- | ------------ | ---------------------- | ------------------------------------------------------- |
| id            | UUID         | PK                     | Unique alert identifier                                 |
| tenant_id     | UUID         | FK, NOT NULL           | Reference to tenants.id                                 |
| assigned_to   | UUID         | FK                     | Reference to users.id (assigned user)                    |
| resolved_by   | UUID         | FK                     | Reference to users.id (resolved by user)                 |
| source        | VARCHAR(100) | NOT NULL               | Alert source (e.g., Prometheus, CloudWatch)              |
| alert_type    | VARCHAR(255) | NOT NULL               | Type of alert                                           |
| severity      | ENUM         | NOT NULL               | Severity: critical, high, medium, low                    |
| title         | VARCHAR(500) | NOT NULL               | Alert title                                             |
| description   | TEXT         |                        | Alert description                                       |
| raw_payload   | JSONB        |                        | Original alert payload                                  |
| status        | ENUM         | NOT NULL               | Status: open, investigating, resolved, false_positive, ignored |
| received_at   | TIMESTAMP    | NOT NULL DEFAULT NOW() | Alert received timestamp                                |
| resolved_at   | TIMESTAMP    |                        | Resolution timestamp                                    |
| created_at    | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp                                      |
| updated_at    | TIMESTAMP    | NOT NULL DEFAULT NOW() | Last update timestamp                                   |

**Indexes:**

- `idx_alerts_tenant_id` on (tenant_id)
- `idx_alerts_assigned_to` on (assigned_to)
- `idx_alerts_status` on (status)
- `idx_alerts_received_at` on (received_at DESC)

### 4. issues

Issues created from alerts for AI processing and tracking.

| Column        | Type         | Constraints            | Description                                                                 |
| ------------- | ------------ | ---------------------- | --------------------------------------------------------------------------- |
| id            | UUID         | PK                     | Unique issue identifier                                                     |
| tenant_id     | UUID         | FK, NOT NULL           | Reference to tenants.id                                                     |
| assigned_to   | UUID         | FK                     | Reference to users.id (assigned user)                                       |
| created_by    | UUID         | FK                     | Reference to users.id (creator)                                             |
| skill_id      | UUID         | FK                     | Reference to skills.id (if matched)                                         |
| title         | VARCHAR(500) | NOT NULL               | Issue title                                                                 |
| description   | TEXT         |                        | Issue description                                                           |
| status        | ENUM         | NOT NULL               | Status: analyzing, in_progress, resolved, false_positive, unable_to_resolve |
| ai_conclusion | TEXT         |                        | AI analysis conclusion                                                      |
| is_real_issue | BOOLEAN      | DEFAULT NULL           | Whether AI identified as real issue                                         |
| created_at    | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp                                                          |
| updated_at    | TIMESTAMP    | NOT NULL DEFAULT NOW() | Last update timestamp                                                       |
| resolved_at   | TIMESTAMP    |                        | Resolution timestamp                                                        |

**Indexes:**

- `idx_issues_tenant_id` on (tenant_id)
- `idx_issues_assigned_to` on (assigned_to)
- `idx_issues_created_by` on (created_by)
- `idx_issues_skill_id` on (skill_id)
- `idx_issues_status` on (status)

### 5. issue_alert_bindings

Bindings between issues and alerts (one-to-many relationship).

| Column     | Type      | Constraints            | Description               |
| ---------- | --------- | ---------------------- | ------------------------- |
| id         | UUID      | PK                     | Unique binding identifier |
| tenant_id  | UUID      | FK, NOT NULL           | Reference to tenants.id   |
| issue_id   | UUID      | FK, NOT NULL           | Reference to issues.id    |
| alert_id   | UUID      | FK, NOT NULL           | Reference to alerts.id    |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp        |

**Indexes:**

- `idx_issue_alert_bindings_tenant_id` on (tenant_id)
- `idx_issue_alert_bindings_issue_id` on (issue_id)
- `idx_issue_alert_bindings_alert_id` on (alert_id)

### 6. issue_logs

Logs of AI processing steps for each issue.

| Column     | Type      | Constraints            | Description                                             |
| ---------- | --------- | ---------------------- | ------------------------------------------------------- |
| id         | UUID      | PK                     | Unique log identifier                                   |
| issue_id   | UUID      | FK, NOT NULL           | Reference to issues.id                                  |
| log_type   | ENUM      | NOT NULL               | Type: skill_matched, tool_called, reasoning, conclusion |
| content    | TEXT      | NOT NULL               | Log content                                             |
| metadata   | JSONB     |                        | Additional metadata                                     |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp                                      |

**Indexes:**

- `idx_issue_logs_issue_id` on (issue_id)
- `idx_issue_logs_created_at` on (created_at DESC)

### 7. skills

Stores problem-solving SOPs (Standard Operating Procedures).

| Column              | Type         | Constraints            | Description                  |
| ------------------- | ------------ | ---------------------- | ---------------------------- |
| id                  | UUID         | PK                     | Unique skill identifier      |
| tenant_id           | UUID         | FK, NOT NULL           | Reference to tenants.id      |
| created_by          | UUID         | FK                     | Reference to users.id        |
| name                | VARCHAR(255) | NOT NULL               | Skill name                   |
| problem_description | TEXT         | NOT NULL               | Problem this skill solves    |
| sop                 | TEXT         | NOT NULL               | Standard Operating Procedure |
| embedding           | VECTOR(1536) |                       | Vector embedding for semantic search |
| status              | ENUM         | NOT NULL               | Status: active, inactive     |
| created_at          | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp           |
| updated_at          | TIMESTAMP    | NOT NULL DEFAULT NOW() | Last update timestamp        |

**Indexes:**

- `idx_skills_tenant_id` on (tenant_id)
- `idx_skills_created_by` on (created_by)
- `idx_skills_status` on (status)
- `idx_skills_embedding` on (embedding) - for vector similarity search

### 8. tools

Stores tools that can be called by the AI agent.

| Column      | Type         | Constraints            | Description                                |
| ----------- | ------------ | ---------------------- | ------------------------------------------ |
| id          | UUID         | PK                     | Unique tool identifier                     |
| tenant_id   | UUID         | FK, NOT NULL           | Reference to tenants.id                    |
| created_by  | UUID         | FK                     | Reference to users.id                      |
| name        | VARCHAR(255) | NOT NULL               | Tool name                                  |
| description | TEXT         |                        | Tool description                           |
| type        | ENUM         | NOT NULL               | Type: mcp, custom_code                     |
| config      | JSONB        | NOT NULL               | Tool configuration (MCP config or JS code) |
| status      | ENUM         | NOT NULL               | Status: active, inactive                   |
| created_at  | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp                         |
| updated_at  | TIMESTAMP    | NOT NULL DEFAULT NOW() | Last update timestamp                      |

**Indexes:**

- `idx_tools_tenant_id` on (tenant_id)
- `idx_tools_created_by` on (created_by)
- `idx_tools_name` on (name)
- `idx_tools_status` on (status)

### 9. alert_skill_bindings

Manual bindings between alerts and skills.

| Column        | Type         | Constraints            | Description                          |
| ------------- | ------------ | ---------------------- | ------------------------------------ |
| id            | UUID         | PK                     | Unique binding identifier            |
| tenant_id     | UUID         | FK, NOT NULL           | Reference to tenants.id              |
| alert_pattern | VARCHAR(500) | NOT NULL               | Alert pattern (regex or keyword)     |
| skill_id      | UUID         | FK, NOT NULL           | Reference to skills.id               |
| priority      | INT          | DEFAULT 0              | Priority for matching (higher first) |
| created_at    | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp                   |

**Indexes:**

- `idx_alert_skill_bindings_tenant_id` on (tenant_id)
- `idx_alert_skill_bindings_skill_id` on (skill_id)
- `idx_alert_skill_bindings_priority` on (priority DESC)

### 10. configurations

Platform configuration settings (IM tools, API keys, etc.).

| Column     | Type         | Constraints            | Description                       |
| ---------- | ------------ | ---------------------- | --------------------------------- |
| id         | UUID         | PK                     | Unique config identifier          |
| tenant_id  | UUID         | FK, NOT NULL           | Reference to tenants.id           |
| config_type| VARCHAR(100) | NOT NULL               | Config type: lark, slack, general |
| config_key | VARCHAR(255) | NOT NULL               | Config key                        |
| config_value| TEXT        | NOT NULL               | Config value (encrypted)          |
| created_at | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp                |
| updated_at | TIMESTAMP    | NOT NULL DEFAULT NOW() | Last update timestamp             |

**Indexes:**

- `idx_configurations_tenant_id` on (tenant_id)
- `idx_configurations_type_key` on (config_type, config_key) - UNIQUE

### 11. im_receivers

Configuration for IM bot receivers (Slack/Lark) in groups/channels. Webhooks include `receiver_im` parameter to match and forward alerts.

| Column         | Type         | Constraints            | Description                                                   |
| -------------- | ------------ | ---------------------- | ------------------------------------------------------------- |
| id             | UUID         | PK                     | Unique receiver identifier                                    |
| tenant_id      | UUID         | FK, NOT NULL           | Reference to tenants.id                                       |
| name           | VARCHAR(255) | NOT NULL               | Receiver name (e.g., "DevOps Slack", "On-call Lark")          |
| receiver_im    | VARCHAR(100) | NOT NULL, UNIQUE       | Receiver identifier from webhook parameter for matching       |
| im_type        | ENUM         | NOT NULL               | IM platform: slack, lark                                      |
| bot_token      | TEXT         |                        | Bot authentication token (encrypted, stored separately)       |
| webhook_url    | VARCHAR(500) |                        | Optional: direct webhook URL for simple integration           |
| destination_id | VARCHAR(255) |                        | Target group/channel ID (Slack channel_id, Lark open_chat_id) |
| status         | ENUM         | NOT NULL               | Status: active, inactive                                      |
| created_at     | TIMESTAMP    | NOT NULL DEFAULT NOW() | Creation timestamp                                            |
| updated_at     | TIMESTAMP    | NOT NULL DEFAULT NOW() | Last update timestamp                                         |

**Indexes:**

- `idx_im_receivers_tenant_id` on (tenant_id)
- `idx_im_receivers_receiver_im` on (receiver_im) UNIQUE
- `idx_im_receivers_status` on (status)

**Notes:**

- `receiver_im`: Unique identifier passed in webhook URL parameter (e.g., `?receiver_im=devops-slack`)
- `bot_token`: Sensitive credential, should be encrypted at application level
- `webhook_url`: Alternative to bot_token for simpler integrations
- `destination_id`: Where messages are sent (Slack channel ID or Lark open_chat_id)

## Relationships

```
tenants 1:N users
tenants 1:N alerts
tenants 1:N issues
tenants 1:N skills
tenants 1:N tools
tenants 1:N configurations
tenants 1:N alert_skill_bindings
tenants 1:N issue_alert_bindings
tenants 1:N im_receivers

users 1:N alerts (as assigned_to)
users 1:N alerts (as resolved_by)
users 1:N issues (as assigned_to)
users 1:N issues (as created_by)
users 1:N skills (as created_by)
users 1:N tools (as created_by)

issues 1:N alerts (via issue_alert_bindings)
alerts 1:1 issues (via issue_alert_bindings)
alerts 1:N alert_skill_bindings (via pattern matching)

issues 1:N issue_logs
issues N:1 skills

skills 1:N alert_skill_bindings
```

## Design Decisions

### 1. UUID vs Auto-increment ID

Using UUID for all primary keys to:

- Support multi-tenancy with globally unique identifiers
- Facilitate distributed system design
- Enable easy data migration and merging

### 2. JSONB for Flexible Data

Using JSONB for:

- `alerts.raw_payload`: Store original alert data from various sources
- `tools.config`: Store different tool configurations (MCP or custom code)
- `issue_logs.metadata`: Store flexible metadata for different log types

### 3. Vector Embedding for Skill Matching

Using pgvector extension for semantic similarity search on skills:

- Enables intelligent skill matching based on problem description
- Improves automatic skill selection for alert processing

### 4. Separation of Alerts and Issues

- `alerts`: Raw incoming alert data
- `issues`: AI-processed entities with analysis and resolution tracking
- This separation allows for reprocessing and audit trails

### 5. Status Enums

Using ENUM for type safety and clear state management:

- Alert status: pending, processing, resolved, ignored
- Issue status: analyzing, in_progress, resolved, false_positive, unable_to_resolve
- Tool/Skill status: active, inactive

## Database Technology Recommendations

1. **PostgreSQL 15+** with extensions:
   - `pgvector`: For skill semantic matching
   - `pg_stat_statements`: For query performance monitoring

2. **Connection Pooling**: Use PgBouncer for high-concurrency scenarios

3. **Partitioning**: Consider partitioning `alerts` and `issue_logs` by `created_at` for large-scale deployments

## SQL Schema (PostgreSQL)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Users (integrates with Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Matches Supabase Auth user_id
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_sign_in_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    source VARCHAR(100) NOT NULL,
    alert_type VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    raw_payload JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive', 'ignored')),
    received_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant_id ON alerts(tenant_id);
CREATE INDEX idx_alerts_assigned_to ON alerts(assigned_to);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_received_at ON alerts(received_at DESC);

-- Issues
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'analyzing' CHECK (status IN ('analyzing', 'in_progress', 'resolved', 'false_positive', 'unable_to_resolve')),
    ai_conclusion TEXT,
    is_real_issue BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX idx_issues_tenant_id ON issues(tenant_id);
CREATE INDEX idx_issues_assigned_to ON issues(assigned_to);
CREATE INDEX idx_issues_created_by ON issues(created_by);
CREATE INDEX idx_issues_skill_id ON issues(skill_id);
CREATE INDEX idx_issues_status ON issues(status);

-- Issue Alert Bindings
CREATE TABLE issue_alert_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_alert_bindings_tenant_id ON issue_alert_bindings(tenant_id);
CREATE INDEX idx_issue_alert_bindings_issue_id ON issue_alert_bindings(issue_id);
CREATE INDEX idx_issue_alert_bindings_alert_id ON issue_alert_bindings(alert_id);

-- Issue Logs
CREATE TABLE issue_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    log_type VARCHAR(50) NOT NULL CHECK (log_type IN ('skill_matched', 'tool_called', 'reasoning', 'conclusion')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_logs_issue_id ON issue_logs(issue_id);
CREATE INDEX idx_issue_logs_created_at ON issue_logs(created_at DESC);

-- Skills
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    problem_description TEXT NOT NULL,
    sop TEXT NOT NULL,
    embedding VECTOR(1536),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_tenant_id ON skills(tenant_id);
CREATE INDEX idx_skills_created_by ON skills(created_by);
CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_skills_embedding ON skills USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Tools
CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('mcp', 'custom_code')),
    config JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_tools_tenant_id ON tools(tenant_id);
CREATE INDEX idx_tools_created_by ON tools(created_by);
CREATE INDEX idx_tools_name ON tools(name);
CREATE INDEX idx_tools_status ON tools(status);

-- Alert Skill Bindings
CREATE TABLE alert_skill_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alert_pattern VARCHAR(500) NOT NULL,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    priority INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_skill_bindings_tenant_id ON alert_skill_bindings(tenant_id);
CREATE INDEX idx_alert_skill_bindings_skill_id ON alert_skill_bindings(skill_id);
CREATE INDEX idx_alert_skill_bindings_priority ON alert_skill_bindings(priority DESC);

-- Configurations
CREATE TABLE configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config_type VARCHAR(100) NOT NULL,
    config_key VARCHAR(255) NOT NULL,
    config_value TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, config_type, config_key)
);

CREATE INDEX idx_configurations_tenant_id ON configurations(tenant_id);
CREATE INDEX idx_configurations_type_key ON configurations(config_type, config_key);

-- IM Receivers
CREATE TABLE im_receivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    receiver_im VARCHAR(100) NOT NULL,
    im_type VARCHAR(20) NOT NULL CHECK (im_type IN ('slack', 'lark')),
    bot_token TEXT,
    webhook_url VARCHAR(500),
    destination_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, receiver_im)
);

CREATE INDEX idx_im_receivers_tenant_id ON im_receivers(tenant_id);
CREATE INDEX idx_im_receivers_receiver_im ON im_receivers(receiver_im);
CREATE INDEX idx_im_receivers_status ON im_receivers(status);

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configurations_updated_at BEFORE UPDATE ON configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_im_receivers_updated_at BEFORE UPDATE ON im_receivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Next Steps

1. Review and approve this database design
2. Create migration scripts
3. Set up the database with pgvector extension
4. Implement the API server with LangChain integration
5. Build the frontend management interface
