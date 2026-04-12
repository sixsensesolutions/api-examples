resource "aws_acm_certificate" "wildcard" {
  domain_name               = "*.sixsensesolutions.net"
  subject_alternative_names = ["sixsensesolutions.net"]
  validation_method         = "DNS"
  tags                      = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_route53_zone" "certificate_zone" {
  zone_id      = "Z05935862JDTZMUDE2ZYL"
  private_zone = false
}

resource "aws_route53_record" "wildcard_validation" {
  for_each = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options :
    dvo.resource_record_name => dvo...
  }

  allow_overwrite = true
  zone_id = data.aws_route53_zone.certificate_zone.zone_id
  name    = each.value[0].resource_record_name
  type    = each.value[0].resource_record_type
  ttl     = 60
  records = [each.value[0].resource_record_value]
}

resource "aws_acm_certificate_validation" "wildcard" {
  certificate_arn         = aws_acm_certificate.wildcard.arn
  validation_record_fqdns = [for record in aws_route53_record.wildcard_validation : record.fqdn]
}
