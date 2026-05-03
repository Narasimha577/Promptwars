param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "asia-south1",
  [string]$ServiceName = "votepath-election-assistant",
  [string]$GeminiApiKey = ""
)

gcloud config set project $ProjectId
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

$image = "gcr.io/$ProjectId/$ServiceName"
gcloud builds submit --tag $image

$deployArgs = @(
  "run", "deploy", $ServiceName,
  "--image", $image,
  "--platform", "managed",
  "--region", $Region,
  "--allow-unauthenticated"
)

if ($GeminiApiKey -ne "") {
  $deployArgs += "--set-env-vars"
  $deployArgs += "GEMINI_API_KEY=$GeminiApiKey"
}

gcloud @deployArgs
