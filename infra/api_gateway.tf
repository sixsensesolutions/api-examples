resource "aws_apigatewayv2_api" "http" {
  name          = var.project_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId    = "$context.requestId"
      ip           = "$context.identity.sourceIp"
      requestTime  = "$context.requestTime"
      httpMethod   = "$context.httpMethod"
      routeKey     = "$context.routeKey"
      status       = "$context.status"
      responseTime = "$context.responseLatency"
    })
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "generate" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.generate.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "generate_post" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /v1/generate"
  target    = "integrations/${aws_apigatewayv2_integration.generate.id}"
}

resource "aws_apigatewayv2_integration" "signup" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.signup.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "signup_post" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /v1/signup"
  target    = "integrations/${aws_apigatewayv2_integration.signup.id}"
}

resource "aws_apigatewayv2_integration" "contact" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contact.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "contact_post" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /v1/contact"
  target    = "integrations/${aws_apigatewayv2_integration.contact.id}"
}

resource "aws_apigatewayv2_integration" "validate" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.validate.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "validate_post" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /v1/validate"
  target    = "integrations/${aws_apigatewayv2_integration.validate.id}"
}

resource "aws_apigatewayv2_integration" "breach_check" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.breach_check.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "breach_check_post" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /v1/breach-check"
  target    = "integrations/${aws_apigatewayv2_integration.breach_check.id}"
}

resource "aws_apigatewayv2_integration" "audit_log" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.audit_log.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "audit_log_get" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /v1/audit-log"
  target    = "integrations/${aws_apigatewayv2_integration.audit_log.id}"
}
