package common

import (
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

var Validate *validator.Validate
var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9_]+$`)
var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func init() {
	Validate = validator.New()
	_ = Validate.RegisterValidation("username", validateUsername)
}

func validateUsername(fl validator.FieldLevel) bool {
	return IsValidUsername(fl.Field().String())
}

func IsValidUsername(username string) bool {
	username = strings.TrimSpace(username)
	return usernamePattern.MatchString(username) || IsValidEmail(username)
}

func IsValidEmail(email string) bool {
	return emailPattern.MatchString(strings.TrimSpace(email))
}
