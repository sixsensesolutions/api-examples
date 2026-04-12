terraform {
  backend "s3" {
    bucket         = "six-sense-terraform-state"
    key            = "api/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "six-sense-terraform-locks"
  }
}
