# NeuroAudit Agent - Detailed Setup Guide

This guide walks you through setting up the NeuroAudit Agent in your own environment.

## Prerequisites

Before you begin, ensure you have:

- ✅ An n8n instance (self-hosted or cloud)
- ✅ A Telegram bot created via [@BotFather](https://t.me/botfather)
- ✅ An OpenRouter account with API access
- ✅ A Google Cloud project with Sheets API enabled
- ✅ Basic understanding of workflow automation

## Table of Contents

1. [n8n Setup](#1-n8n-setup)
2. [Telegram Bot Configuration](#2-telegram-bot-configuration)
3. [OpenRouter Setup](#3-openrouter-setup)
4. [Google Sheets Configuration](#4-google-sheets-configuration)
5. [Workflow Import](#5-workflow-import)
6. [Testing and Validation](#6-testing-and-validation)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. n8n Setup

### Self-Hosted Option (Recommended for Healthcare)

#### Using Docker

```bash
# Create a directory for n8n data
mkdir -p ~/.n8n

# Run n8n container
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

#### Using npm

```bash
# Install n8n globally
npm install -g n8n

# Start n8n
n8n start
```

Access n8n at `http://localhost:5678`

### Cloud Option

Alternatively, use [n8n.cloud](https://n8n.cloud) for managed hosting.

---

## 2. Telegram Bot Configuration

### Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts:
   - **Bot name**: "NeuroAudit Agent" (or your preferred name)
   - **Bot username**: Must end in "bot" (e.g., `neuroaudit_agent_bot`)
4. Save the **bot token** provided (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Configure Bot Settings

```
/setcommands
start - Start the bot
help - Show help information
```

### Add Bot Token to n8n

1. In n8n, go to **Credentials** → **Add credential**
2. Search for "Telegram"
3. Select **Telegram API**
4. Paste your bot token
5. Click **Save**

---

## 3. OpenRouter Setup

### Create an OpenRouter Account

1. Visit [openrouter.ai](https://openrouter.ai)
2. Sign up for an account
3. Navigate to **API Keys**
4. Generate a new API key
5. Save the key (format: `sk-or-v1-xxxxxxxxxxxx`)

### Recommended Model

- **Model**: `google/gemini-2.5-flash-lite`
- **Cost**: ~$0.10 per 1M input tokens (as of 2026)
- **Speed**: Fast responses suitable for real-time processing

### Add OpenRouter Credentials to n8n

1. In n8n, go to **Credentials** → **Add credential**
2. Search for "OpenRouter"
3. Select **OpenRouter API**
4. Paste your API key
5. Click **Save**

---

## 4. Google Sheets Configuration

### Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Library**
4. Search for "Google Sheets API"
5. Click **Enable**

### Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. **Authorized redirect URIs**:
   ```
   https://your-n8n-instance.com/rest/oauth2-credential/callback
   ```
   For local development:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```
5. Save the **Client ID** and **Client Secret**

### Add Google Sheets Credentials to n8n

1. In n8n, go to **Credentials** → **Add credential**
2. Search for "Google Sheets"
3. Select **Google Sheets OAuth2 API**
4. Enter:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Click **Connect my account**
6. Authorize access in the popup
7. Click **Save**

### Prepare Your Spreadsheet

Create a new Google Sheet with two sheets:

#### Sheet 1: `raw_telegram_log`

| Column | Type | Description |
|--------|------|-------------|
| Timestamp | Number | Unix timestamp |
| Sender_Name | Text | Telegram user first name |
| Chat_ID | Number | Telegram chat identifier |
| Raw_Message_Text | Text | Original message content |

#### Sheet 2: `master_surgery_sheet`

| Column | Type | Description |
|--------|------|-------------|
| surgery_id | Text (Auto) | Unique identifier |
| surgery_date | Date | Date of surgery (YYYY-MM-DD) |
| reported_ts | DateTime | When the case was reported |
| reporter_name | Text | Name of reporting doctor |
| telegram_message_id | Number | Message ID for reference |
| patient_name | Text | Patient name (anonymize in production) |
| patient_ic_mrn | Text | Patient identifier |
| age_group | Text | "Adult" or "Paediatric" |
| urgency | Text | "Emergency" or "Elective" |
| surgery_category | Text | Predefined category |
| diagnosis | Text | Full diagnosis text |
| operation | Text | Surgical procedure details |

**Note**: Add data validation for `age_group`, `urgency`, and `surgery_category` columns to enforce dropdown selections.

---

## 5. Workflow Import

### Import the Workflow

1. Download `workflows/NeuroAudit-Agent-v3-clean.json`
2. In n8n, click **Workflows** → **Import from File**
3. Select the downloaded JSON file
4. Click **Import**

### Configure Workflow Nodes

#### Telegram Trigger Node
- Select your Telegram credential
- Updates to listen for: **message**

#### OpenRouter Chat Model Node
- Select your OpenRouter credential
- Model: `google/gemini-2.5-flash-lite`

#### Raw Telegram Log Node (Google Sheets)
- Select your Google Sheets credential
- Operation: **Append**
- Document: Select your spreadsheet
- Sheet: `raw_telegram_log`
- Columns: Already mapped in the workflow

#### Surgery Audit Output Node (Google Sheets)
- Select your Google Sheets credential
- Operation: **Append**
- Document: Select your spreadsheet
- Sheet: `master_surgery_sheet`
- Columns: Already mapped in the workflow

### Update Google Sheet IDs

1. Open each Google Sheets node
2. Click the document selector
3. Choose your prepared spreadsheet from the list
4. Verify the sheet name matches (`raw_telegram_log` or `master_surgery_sheet`)

### Save the Workflow

Click **Save** in the top right corner.

---

## 6. Testing and Validation

### Test Message Format

Send this test message to your Telegram bot:

```
Emergency surgery today
Patient: John Doe
IC: 123456-78-9012
Age: 45 years
DX: Acute subdural hematoma post-trauma
OP: Decompressive craniectomy and evacuation of hematoma
```

### Expected Output

Check your Google Sheet. You should see:

**raw_telegram_log Sheet:**
- New row with timestamp, your name, chat ID, and full message text

**master_surgery_sheet Sheet:**
- `surgery_date`: Today's date
- `reporter_name`: Your Telegram name
- `patient_name`: "John Doe"
- `patient_ic_mrn`: "123456-78-9012"
- `age_group`: "Adult"
- `urgency`: "Emergency"
- `surgery_category`: "Trauma (Craniotomy / Craniectomy)"
- `diagnosis`: "Acute subdural hematoma post-trauma"
- `operation`: "Decompressive craniectomy and evacuation of hematoma"

### Validation Checklist

- [ ] Telegram bot receives messages
- [ ] AI correctly extracts patient information
- [ ] Categories are correctly assigned
- [ ] Age group classification is accurate
- [ ] Data appears in both sheets
- [ ] Timestamp and metadata are correct

---

## 7. Troubleshooting

### Issue: Workflow Not Triggering

**Symptoms**: Sending Telegram messages doesn't start the workflow

**Solutions**:
1. Verify the workflow is **Active** (toggle in top right)
2. Check Telegram bot token is correct
3. Ensure webhook is properly registered (may take a few minutes)
4. Try sending `/start` to the bot first

### Issue: AI Parsing Errors

**Symptoms**: JavaScript mapper returns errors or empty data

**Solutions**:
1. Check OpenRouter API key is valid and has credits
2. Verify the model name: `google/gemini-2.5-flash-lite`
3. Review execution logs in n8n for detailed error messages
4. Test with simpler message format first

### Issue: Google Sheets Not Updating

**Symptoms**: Workflow executes but sheets remain empty

**Solutions**:
1. Verify OAuth2 authentication is complete
2. Check sheet names match exactly (case-sensitive)
3. Ensure column headers in your sheet match the workflow mapping
4. Verify spreadsheet permissions (editor access required)

### Issue: Incorrect Categorization

**Symptoms**: Surgeries assigned to wrong categories

**Solutions**:
1. Review the AI system prompt in the workflow
2. Add more specific keywords to the JavaScript mapper
3. Adjust inference rules in `normalizeCategory()` function
4. Provide clearer case descriptions in Telegram messages

### Getting Help

If you encounter issues:
1. Check n8n execution logs: **Executions** tab in workflow
2. Review error messages in each node
3. Test nodes individually using **Test workflow** button
4. Consult [n8n community forum](https://community.n8n.io)

---

## Production Considerations

### Security

- [ ] Use HTTPS for n8n (required for production)
- [ ] Enable n8n authentication
- [ ] Restrict Telegram bot access to specific chat IDs
- [ ] Implement data encryption for patient information
- [ ] Regular backup of Google Sheets data

### Compliance

- [ ] Review local healthcare data regulations
- [ ] Anonymize patient identifiers
- [ ] Implement access logging
- [ ] Create data retention policy
- [ ] Obtain necessary IT/compliance approvals

### Performance

- [ ] Monitor OpenRouter API usage and costs
- [ ] Set up error notifications (n8n workflow error handler)
- [ ] Implement rate limiting if needed
- [ ] Regular review of audit data quality

### Maintenance

- [ ] Weekly review of uncategorized cases
- [ ] Monthly update of surgery categories
- [ ] Quarterly review of JavaScript inference rules
- [ ] Keep n8n and node packages updated

---

## Next Steps

After successful setup:

1. **Train Your Team**: Show medical staff how to format case reports
2. **Create Templates**: Provide message templates for common scenarios
3. **Build Dashboards**: Connect Google Sheets to Data Studio or Excel
4. **Gather Feedback**: Refine categories based on actual usage
5. **Scale Gradually**: Start with one department, expand as confidence grows

---

## Additional Resources

- [n8n Documentation](https://docs.n8n.io)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

**Questions?** Feel free to open an issue on GitHub or reach out via LinkedIn.
