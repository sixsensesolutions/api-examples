output "api_gateway_url" {
  description = "Base API Gateway endpoint URL."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_function_name" {
  description = "Lambda function name."
  value       = aws_lambda_function.generate.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN."
  value       = aws_lambda_function.generate.arn
}

output "dynamodb_table_name" {
  description = "DynamoDB table name."
  value       = aws_dynamodb_table.api_keys.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN."
  value       = aws_dynamodb_table.api_keys.arn
}

output "lambda_role_arn" {
  description = "Lambda IAM role ARN."
  value       = aws_iam_role.lambda_role.arn
}

output "api_gateway_id" {
  description = "API Gateway HTTP API id."
  value       = aws_apigatewayv2_api.http.id
}

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name for API."
  value       = aws_cloudwatch_log_group.api.name
}

output "custom_domain_url" {
  description = "Custom domain URL for the API."
  value       = "https://api.sixsensesolutions.net"
}

output "api_gateway_regional_domain" {
  description = "API Gateway regional domain target for custom domain alias."
  value       = aws_apigatewayv2_domain_name.api_custom_domain.domain_name_configuration[0].target_domain_name
}

output "signup_endpoint" {
  description = "Signup endpoint URL."
  value       = "https://api.sixsensesolutions.net/v1/signup"
}

output "contact_endpoint" {
  description = "Contact endpoint URL."
  value       = "https://api.sixsensesolutions.net/v1/contact"
}

output "validate_endpoint" {
  description = "Validate endpoint URL."
  value       = "https://api.sixsensesolutions.net/v1/validate"
}

output "breach_check_endpoint" {
  description = "Breach check endpoint URL."
  value       = "https://api.sixsensesolutions.net/v1/breach-check"
}

output "audit_log_table_name" {
  description = "DynamoDB audit log table name."
  value       = aws_dynamodb_table.audit_log.name
}

output "audit_log_table_arn" {
  description = "DynamoDB audit log table ARN."
  value       = aws_dynamodb_table.audit_log.arn
}

output "audit_log_endpoint" {
  description = "Audit log endpoint URL."
  value       = "https://api.sixsensesolutions.net/v1/audit-log"
}
