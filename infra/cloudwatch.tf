resource "aws_cloudwatch_log_group" "api" {
  name              = "/six-sense/api"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alarm when Lambda errors exceed 5 in 5 minutes."
  alarm_actions       = []
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.generate.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration_p95" {
  alarm_name          = "${var.project_name}-lambda-duration-p95"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 5000
  alarm_description   = "Alarm when Lambda p95 duration exceeds 5000 ms."
  alarm_actions       = []
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.generate.function_name
  }
}
