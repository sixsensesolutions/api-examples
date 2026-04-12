data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../src"
  output_path = "${path.module}/lambda-src.zip"
}

resource "aws_sqs_queue" "lambda_dlq" {
  name = "${var.project_name}-dlq"
  tags = local.common_tags
}

resource "aws_lambda_function" "generate" {
  function_name = "${var.project_name}-generate"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role          = aws_iam_role.lambda_role.arn
  handler       = "handlers/generate.handler"
  runtime       = "nodejs20.x"
  memory_size   = var.lambda_memory
  timeout       = var.lambda_timeout

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  reserved_concurrent_executions = 100

  environment {
    variables = {
      DYNAMODB_TABLE  = aws_dynamodb_table.api_keys.name
      AUDIT_LOG_TABLE = aws_dynamodb_table.audit_log.name
      LOG_GROUP       = aws_cloudwatch_log_group.api.name
      NODE_ENV        = var.environment
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_apigw_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.generate.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_function" "signup" {
  function_name    = "${var.project_name}-signup"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.signup_lambda_role.arn
  handler          = "handlers/signup.handler"
  runtime          = "nodejs20.x"
  memory_size      = var.lambda_memory
  timeout          = var.lambda_timeout

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  reserved_concurrent_executions = 100

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.api_keys.name
      LOG_GROUP      = aws_cloudwatch_log_group.api.name
      NODE_ENV       = var.environment
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_apigw_invoke_signup" {
  statement_id  = "AllowExecutionFromAPIGatewaySignup"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.signup.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_function" "contact" {
  function_name    = "${var.project_name}-contact"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.contact_lambda_role.arn
  handler          = "handlers/contact.handler"
  runtime          = "nodejs20.x"
  memory_size      = var.lambda_memory
  timeout          = var.lambda_timeout

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  reserved_concurrent_executions = 100

  environment {
    variables = {
      SES_FROM_EMAIL = "hello@sixsensesolutions.net"
      SES_TO_EMAIL   = "hello@sixsensesolutions.net"
      LOG_GROUP      = aws_cloudwatch_log_group.api.name
      NODE_ENV       = var.environment
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_apigw_invoke_contact" {
  statement_id  = "AllowExecutionFromAPIGatewayContact"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_function" "validate" {
  function_name    = "${var.project_name}-validate"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.validate_lambda_role.arn
  handler          = "handlers/validate.handler"
  runtime          = "nodejs20.x"
  memory_size      = var.lambda_memory
  timeout          = var.lambda_timeout

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      DYNAMODB_TABLE  = aws_dynamodb_table.api_keys.name
      AUDIT_LOG_TABLE = aws_dynamodb_table.audit_log.name
      LOG_GROUP       = aws_cloudwatch_log_group.api.name
      NODE_ENV        = var.environment
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_apigw_invoke_validate" {
  statement_id  = "AllowExecutionFromAPIGatewayValidate"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.validate.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_function" "breach_check" {
  function_name    = "${var.project_name}-breach-check"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.breach_check_lambda_role.arn
  handler          = "handlers/breach-check.handler"
  runtime          = "nodejs20.x"
  memory_size      = var.lambda_memory
  timeout          = var.lambda_timeout

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.api_keys.name
      LOG_GROUP      = aws_cloudwatch_log_group.api.name
      NODE_ENV       = var.environment
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_apigw_invoke_breach_check" {
  statement_id  = "AllowExecutionFromAPIGatewayBreachCheck"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.breach_check.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_function" "audit_log" {
  function_name    = "${var.project_name}-audit-log"
  filename           = data.archive_file.lambda_zip.output_path
  source_code_hash   = data.archive_file.lambda_zip.output_base64sha256
  role               = aws_iam_role.audit_log_lambda_role.arn
  handler            = "handlers/audit-log.handler"
  runtime            = "nodejs20.x"
  memory_size        = var.lambda_memory
  timeout            = var.lambda_timeout

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      DYNAMODB_TABLE  = aws_dynamodb_table.api_keys.name
      AUDIT_LOG_TABLE = aws_dynamodb_table.audit_log.name
      LOG_GROUP       = aws_cloudwatch_log_group.api.name
      NODE_ENV        = var.environment
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_apigw_invoke_audit_log" {
  statement_id  = "AllowExecutionFromAPIGatewayAuditLog"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.audit_log.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
