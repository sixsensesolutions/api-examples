terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = {
    Project      = "six-sense-api"
    Environment  = var.environment
    Owner        = "Six Sense Solutions LLC"
    ManagedBy    = "terraform"
    CostCenter   = "six-sense-solutions"
    MigrateReady = "true"
  }
}
