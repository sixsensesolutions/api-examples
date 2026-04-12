data "aws_route53_zone" "sixsensesolutions" {
  zone_id = "Z05935862JDTZMUDE2ZYL"
}

resource "aws_apigatewayv2_domain_name" "api_custom_domain" {
  domain_name = "api.sixsensesolutions.net"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.wildcard.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_api_mapping" "api_custom_mapping" {
  api_id      = aws_apigatewayv2_api.http.id
  domain_name = aws_apigatewayv2_domain_name.api_custom_domain.id
  stage       = aws_apigatewayv2_stage.default.name
}

resource "aws_route53_record" "api_custom_domain_alias" {
  zone_id = data.aws_route53_zone.sixsensesolutions.zone_id
  name    = "api.sixsensesolutions.net"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api_custom_domain.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api_custom_domain.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
