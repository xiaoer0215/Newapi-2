package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// AutoDeliveryProduct represents a product available for purchase
type AutoDeliveryProduct struct {
	Id          int     `json:"id"`
	Name        string  `json:"name" gorm:"type:varchar(128);not null"`
	Type        string  `json:"type" gorm:"type:varchar(64);default:general"`
	Description string  `json:"description" gorm:"type:text"`
	Price       float64 `json:"price" gorm:"not null;default:0"` // Price in currency
	Quota       int     `json:"quota" gorm:"type:int;not null;default:0"`           // Optional quota value bound to the product
	Stock       int     `json:"stock" gorm:"type:int;not null;default:0"`           // Updated dynamically
	Enabled     bool    `json:"enabled" gorm:"type:boolean;default:true"`           // false=0 in sqlite/mysql, true=1
	Tutorial    string  `json:"tutorial" gorm:"type:text"`                          // Tutorial text or link shown after purchase

	CreatedAt int64 `json:"created_at" gorm:"bigint"`
	UpdatedAt int64 `json:"updated_at" gorm:"bigint"`
}

func (p *AutoDeliveryProduct) BeforeCreate(tx *gorm.DB) error {
	p.CreatedAt = common.GetTimestamp()
	p.UpdatedAt = common.GetTimestamp()
	return nil
}

func (p *AutoDeliveryProduct) BeforeUpdate(tx *gorm.DB) error {
	p.UpdatedAt = common.GetTimestamp()
	return nil
}

// AutoDeliveryCard represents a card/secret tied to a product
type AutoDeliveryCard struct {
	Id        int    `json:"id"`
	ProductId int    `json:"product_id" gorm:"index"`
	Secret    string `json:"secret" gorm:"type:varchar(255);not null"`
	UserId    int    `json:"user_id" gorm:"index;default:0"`
	Status    string `json:"status" gorm:"type:varchar(32);default:available;index"` // available / sold
	BuyTime   int64  `json:"buy_time" gorm:"bigint;default:0"`

	CreatedAt int64 `json:"created_at" gorm:"bigint"`
	UpdatedAt int64 `json:"updated_at" gorm:"bigint"`
}

func (c *AutoDeliveryCard) BeforeCreate(tx *gorm.DB) error {
	c.CreatedAt = common.GetTimestamp()
	c.UpdatedAt = common.GetTimestamp()
	return nil
}

func (c *AutoDeliveryCard) BeforeUpdate(tx *gorm.DB) error {
	c.UpdatedAt = common.GetTimestamp()
	return nil
}

func GetAutoDeliveryProducts(onlyEnabled bool) ([]*AutoDeliveryProduct, error) {
	var products []*AutoDeliveryProduct
	tx := DB
	if onlyEnabled {
		tx = tx.Where("enabled = ?", common.UsingPostgreSQL || common.UsingMySQL) // simple workaround for bool, properly:
		// Wait, for GORM bool fields it handles dialect differences automatically if we use true/false.
		tx = DB.Where("enabled = ?", true)
	}
	err := tx.Order("id desc").Find(&products).Error
	return products, err
}

func GetAutoDeliveryProductById(id int) (*AutoDeliveryProduct, error) {
	var product AutoDeliveryProduct
	err := DB.First(&product, id).Error
	return &product, err
}

func InsertAutoDeliveryProduct(product *AutoDeliveryProduct) error {
	return DB.Create(product).Error
}

func UpdateAutoDeliveryProduct(product *AutoDeliveryProduct) error {
	return DB.Save(product).Error
}

func DeleteAutoDeliveryProduct(id int) error {
	return DB.Delete(&AutoDeliveryProduct{}, id).Error
}

func UpdateAutoDeliveryProductStock(productId int) error {
	var count int64
	err := DB.Model(&AutoDeliveryCard{}).Where("product_id = ? AND status = ?", productId, "available").Count(&count).Error
	if err != nil {
		return err
	}
	return DB.Model(&AutoDeliveryProduct{}).Where("id = ?", productId).Update("stock", count).Error
}

func InsertAutoDeliveryCards(cards []*AutoDeliveryCard) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		for _, card := range cards {
			if err := tx.Create(card).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func GetAutoDeliveryCards(productId int, status string) ([]*AutoDeliveryCard, error) {
	var cards []*AutoDeliveryCard
	tx := DB.Where("product_id = ?", productId)
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	err := tx.Order("id desc").Find(&cards).Error
	return cards, err
}

func DeleteAutoDeliveryCard(id int) error {
	return DB.Delete(&AutoDeliveryCard{}, id).Error
}

func BuyAutoDeliveryProduct(userId int, productId int) (*AutoDeliveryCard, error) {
	var card AutoDeliveryCard
	err := DB.Transaction(func(tx *gorm.DB) error {
		// Find an available card and lock it
		err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("product_id = ? AND status = ?", productId, "available").
			First(&card).Error
		if err != nil {
			return err
		}

		// Update the card
		card.Status = "sold"
		card.UserId = userId
		card.BuyTime = common.GetTimestamp()
		if err := tx.Save(&card).Error; err != nil {
			return err
		}

		// The controller should handle deducting user quota/balance before this.
		return nil
	})

	if err == nil {
		// Update product stock outside of the main transaction to avoid long locks if not necessary
		_ = UpdateAutoDeliveryProductStock(productId)
	}

	return &card, err
}

func GetUserAutoDeliveryCards(userId int) ([]*AutoDeliveryCard, error) {
	var cards []*AutoDeliveryCard
	err := DB.Where("user_id = ?", userId).Order("buy_time desc").Find(&cards).Error
	return cards, err
}

// AutoDeliveryOrder represents a payment order for auto delivery products
type AutoDeliveryOrder struct {
	Id               int     `json:"id"`
	UserId           int     `json:"user_id" gorm:"index"`
	ProductId        int     `json:"product_id" gorm:"index"`
	Money            float64 `json:"money"`
	TradeNo          string  `json:"trade_no" gorm:"unique;type:varchar(255);index"`
	PaymentMethod    string  `json:"payment_method" gorm:"type:varchar(50)"`
	PaymentOrderNo   string  `json:"payment_order_no" gorm:"type:varchar(255);default:''"`
	PaymentInfo      string  `json:"payment_info" gorm:"type:text"`
	CreateTime       int64   `json:"create_time"`
	Status           string  `json:"status" gorm:"type:varchar(16);index"`
	DeliveredCardId  int     `json:"delivered_card_id" gorm:"default:0"`
	DeliveredSecret  string  `json:"delivered_secret" gorm:"type:text"`
	DeliveredTutorial string `json:"delivered_tutorial" gorm:"type:text"`
}

func (o *AutoDeliveryOrder) Insert() error {
	return DB.Create(o).Error
}

func GetAutoDeliveryOrderByTradeNo(tradeNo string) (*AutoDeliveryOrder, error) {
	var order AutoDeliveryOrder
	err := DB.Where("trade_no = ?", tradeNo).First(&order).Error
	return &order, err
}

func ExpireAutoDeliveryOrder(tradeNo string) error {
	return DB.Model(&AutoDeliveryOrder{}).Where("trade_no = ?", tradeNo).Update("status", common.TopUpStatusExpired).Error
}

func CompleteAutoDeliveryOrder(tradeNo string, paymentInfo string, paymentOrderNo string) error {
	var productId int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var order AutoDeliveryOrder
		if err := tx.Where("trade_no = ?", tradeNo).First(&order).Error; err != nil {
			return err
		}

		if order.Status == common.TopUpStatusSuccess {
			return nil // Already completed
		}

		if order.Status != common.TopUpStatusPending {
			return ErrSubscriptionOrderStatusInvalid
		}

		// Get product info
		var product AutoDeliveryProduct
		if err := tx.First(&product, order.ProductId).Error; err != nil {
			return err
		}

		// Find and lock an available card
		var card AutoDeliveryCard
		err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("product_id = ? AND status = ?", order.ProductId, "available").
			First(&card).Error
		if err != nil {
			return err
		}

		// Mark card as sold
		card.Status = "sold"
		card.UserId = order.UserId
		card.BuyTime = common.GetTimestamp()
		if err := tx.Save(&card).Error; err != nil {
			return err
		}

		// Update order status
		order.Status = common.TopUpStatusSuccess
		order.PaymentInfo = paymentInfo
		order.PaymentOrderNo = paymentOrderNo
		order.DeliveredCardId = card.Id
		order.DeliveredSecret = card.Secret
		order.DeliveredTutorial = product.Tutorial
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Add quota to user if product has quota
		if product.Quota > 0 {
			if err := IncreaseUserQuota(order.UserId, product.Quota, false); err != nil {
				return err
			}
		}

		productId = order.ProductId
		return nil
	})
	if err == nil && productId != 0 {
		_ = UpdateAutoDeliveryProductStock(productId)
	}
	return err
}

func GetUserAutoDeliveryOrders(userId int) ([]*AutoDeliveryOrder, error) {
	var orders []*AutoDeliveryOrder
	err := DB.Where("user_id = ?", userId).Order("create_time desc").Find(&orders).Error
	return orders, err
}
