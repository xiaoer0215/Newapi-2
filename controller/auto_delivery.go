package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// --- User endpoints ---

func GetAutoDeliveryProducts(c *gin.Context) {
	products, err := model.GetAutoDeliveryProducts(true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    products,
	})
}

func GetAutoDeliverySelf(c *gin.Context) {
	userId := c.GetInt("id")

	// Get purchased orders with delivery info
	orders, err := model.GetUserAutoDeliveryOrders(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// Transform orders to card-like format for backward compatibility
	type CardResponse struct {
		Id                int    `json:"id"`
		ProductId         int    `json:"product_id"`
		Secret            string `json:"secret"`
		BuyTime           int64  `json:"buy_time"`
		DeliveredTutorial string `json:"delivered_tutorial"`
	}

	cards := make([]CardResponse, 0)
	for _, order := range orders {
		if order.Status == common.TopUpStatusSuccess && order.DeliveredSecret != "" {
			cards = append(cards, CardResponse{
				Id:                order.Id,
				ProductId:         order.ProductId,
				Secret:            order.DeliveredSecret,
				BuyTime:           order.CreateTime,
				DeliveredTutorial: order.DeliveredTutorial,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    cards,
	})
}

func GetAutoDeliveryOrders(c *gin.Context) {
	userId := c.GetInt("id")
	orders, err := model.GetUserAutoDeliveryOrders(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Build product name map
	productIds := make([]int, 0)
	seen := map[int]bool{}
	for _, o := range orders {
		if !seen[o.ProductId] {
			productIds = append(productIds, o.ProductId)
			seen[o.ProductId] = true
		}
	}
	productNameMap := map[int]string{}
	for _, pid := range productIds {
		if p, e := model.GetAutoDeliveryProductById(pid); e == nil {
			productNameMap[pid] = p.Name
		}
	}

	type OrderRow struct {
		Id                int     `json:"id"`
		ProductId         int     `json:"product_id"`
		ProductName       string  `json:"product_name"`
		Money             float64 `json:"money"`
		TradeNo           string  `json:"trade_no"`
		PaymentMethod     string  `json:"payment_method"`
		CreateTime        int64   `json:"create_time"`
		Status            string  `json:"status"`
		DeliveredSecret   string  `json:"delivered_secret"`
		DeliveredTutorial string  `json:"delivered_tutorial"`
	}
	rows := make([]OrderRow, 0, len(orders))
	for _, o := range orders {
		rows = append(rows, OrderRow{
			Id:                o.Id,
			ProductId:         o.ProductId,
			ProductName:       productNameMap[o.ProductId],
			Money:             o.Money,
			TradeNo:           o.TradeNo,
			PaymentMethod:     o.PaymentMethod,
			CreateTime:        o.CreateTime,
			Status:            o.Status,
			DeliveredSecret:   o.DeliveredSecret,
			DeliveredTutorial: o.DeliveredTutorial,
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": rows})
}

// BuyAutoDeliveryProduct is deprecated - now using payment gateway
// Kept for backward compatibility but returns error
func BuyAutoDeliveryProduct(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": "请使用支付网关购买商品",
	})
}

func AdminGetAutoDeliverySetting(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    operation_setting.GetAutoDeliverySetting(),
	})
}

func AdminUpdateAutoDeliverySetting(c *gin.Context) {
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	operation_setting.GetAutoDeliverySetting().Enabled = req.Enabled
	if err := model.UpdateOption("auto_delivery_setting.enabled", fmt.Sprintf("%v", req.Enabled)); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// --- Admin endpoints ---

func AdminListAutoDeliveryProducts(c *gin.Context) {
	products, err := model.GetAutoDeliveryProducts(false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    products,
	})
}

func AdminCreateAutoDeliveryProduct(c *gin.Context) {
	var product model.AutoDeliveryProduct
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}
	
	err := model.InsertAutoDeliveryProduct(&product)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    product,
	})
}

func AdminUpdateAutoDeliveryProduct(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	product, err := model.GetAutoDeliveryProductById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "商品不存在",
		})
		return
	}
	
	var req model.AutoDeliveryProduct
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}

	product.Name = req.Name
	product.Type = req.Type
	product.Description = req.Description
	product.Price = req.Price
	product.Quota = req.Quota
	product.Enabled = req.Enabled
	product.Tutorial = req.Tutorial

	err = model.UpdateAutoDeliveryProduct(product)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    product,
	})
}

func AdminDeleteAutoDeliveryProduct(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	err := model.DeleteAutoDeliveryProduct(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func AdminListAutoDeliveryCards(c *gin.Context) {
	productId, _ := strconv.Atoi(c.Query("product_id"))
	status := c.Query("status")
	cards, err := model.GetAutoDeliveryCards(productId, status)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    cards,
	})
}

func AdminCreateAutoDeliveryCards(c *gin.Context) {
	var req struct {
		ProductId int    `json:"product_id"`
		Secrets   string `json:"secrets"` // Secrets separated by newline
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}

	if req.ProductId <= 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "未指定商品",
		})
		return
	}

	lines := strings.Split(req.Secrets, "\n")
	var cards []*model.AutoDeliveryCard
	for _, line := range lines {
		secret := strings.TrimSpace(line)
		if secret != "" {
			cards = append(cards, &model.AutoDeliveryCard{
				ProductId: req.ProductId,
				Secret:    secret,
				Status:    "available",
			})
		}
	}

	if len(cards) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "没有有效的卡密内容",
		})
		return
	}

	err := model.InsertAutoDeliveryCards(cards)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	_ = model.UpdateAutoDeliveryProductStock(req.ProductId)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("成功添加 %d 个卡密", len(cards)),
	})
}

func AdminDeleteAutoDeliveryCard(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	
	// Ensure we update stock if the card was available
	var productId int
	var status string
	var card model.AutoDeliveryCard
	if err := model.DB.First(&card, id).Error; err == nil {
		productId = card.ProductId
		status = card.Status
	}

	err := model.DeleteAutoDeliveryCard(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if status == "available" && productId > 0 {
		_ = model.UpdateAutoDeliveryProductStock(productId)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
