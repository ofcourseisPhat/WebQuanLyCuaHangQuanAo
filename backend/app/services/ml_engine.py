import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from collections import defaultdict


class RecommendationEngine:
    """
    Hệ thống gợi ý sản phẩm kết hợp:
    - Collaborative Filtering (CF): dựa trên hành vi người dùng
    - Content-Based Filtering (CBF): dựa trên đặc tính sản phẩm
    """

    def __init__(self):
        self.user_item_matrix = None
        self.cf_similarity = None
        self.cbf_similarity = None
        self.product_ids = []
        self.user_ids = []

    def build_user_item_matrix(self, orders_data):
        """
        Xây dựng ma trận user-item từ lịch sử đơn hàng
        orders_data: list of {'user_id', 'product_id', 'quantity'}
        """
        if not orders_data:
            return False

        df = pd.DataFrame(orders_data)
        # Tổng số lượng mỗi sản phẩm mỗi user đã mua → rating ngầm định
        pivot = df.groupby(['user_id', 'product_id'])['quantity'].sum().reset_index()
        matrix = pivot.pivot(index='user_id', columns='product_id', values='quantity').fillna(0)

        self.user_item_matrix = matrix
        self.user_ids = list(matrix.index)
        self.product_ids = list(matrix.columns)

        # CF: cosine similarity giữa các users
        self.cf_similarity = cosine_similarity(matrix.values)
        return True

    def build_content_matrix(self, products_data):
        """
        Xây dựng ma trận đặc trưng sản phẩm cho CBF
        products_data: list of {'id', 'category', 'price', 'discount'}
        """
        if not products_data:
            return False

        df = pd.DataFrame(products_data)
        # Mã hóa category
        category_dummies = pd.get_dummies(df['category'], prefix='cat')
        features = pd.concat([
            df[['price', 'discount']].fillna(0),
            category_dummies
        ], axis=1)

        scaler = StandardScaler()
        scaled = scaler.fit_transform(features)

        self.cbf_similarity = cosine_similarity(scaled)
        self.cbf_product_ids = list(df['id'])
        return True

    def collaborative_filter(self, user_id, top_n=5):
        """Gợi ý dựa trên người dùng tương tự"""
        if self.user_item_matrix is None or user_id not in self.user_ids:
            return []

        user_idx = self.user_ids.index(user_id)
        sim_scores = self.cf_similarity[user_idx]

        # Top 5 users tương tự nhất (bỏ chính mình)
        similar_users = np.argsort(sim_scores)[::-1][1:6]
        already_bought = set(
            int(pid) for pid in self.product_ids
            if self.user_item_matrix.iloc[user_idx][pid] > 0
        )

        # Tổng hợp điểm sản phẩm từ users tương tự
        scores = defaultdict(float)
        for sim_user_idx in similar_users:
            weight = sim_scores[sim_user_idx]
            for pid in self.product_ids:
                if int(pid) not in already_bought:
                    scores[int(pid)] += self.user_item_matrix.iloc[sim_user_idx][pid] * weight

        sorted_products = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [pid for pid, _ in sorted_products[:top_n]]

    def content_based_filter(self, product_id, top_n=5):
        """Gợi ý sản phẩm tương tự dựa trên đặc tính"""
        if self.cbf_similarity is None or product_id not in self.cbf_product_ids:
            return []

        idx = self.cbf_product_ids.index(product_id)
        sim_scores = list(enumerate(self.cbf_similarity[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        sim_scores = [s for s in sim_scores if s[0] != idx][:top_n]

        return [self.cbf_product_ids[i] for i, _ in sim_scores]

    def hybrid_recommend(self, user_id, current_product_id=None, top_n=6):
        """
        Hybrid: kết hợp CF + CBF
        - Nếu có user_id: ưu tiên CF
        - Nếu có product_id: thêm CBF
        """
        recommended = []

        cf_recs = self.collaborative_filter(user_id, top_n=top_n)
        recommended.extend(cf_recs)

        if current_product_id:
            cbf_recs = self.content_based_filter(current_product_id, top_n=top_n)
            for pid in cbf_recs:
                if pid not in recommended:
                    recommended.append(pid)

        return recommended[:top_n]


class BestSellerPredictor:
    """
    Dự đoán sản phẩm bán chạy dựa trên:
    - Lịch sử bán hàng (số lượng theo tháng)
    - Giá sản phẩm
    - Discount
    - Xu hướng
    """

    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.trained = False

    def prepare_features(self, sales_data):
        """
        sales_data: list of {'product_id', 'month', 'sales', 'price', 'discount'}
        """
        df = pd.DataFrame(sales_data)
        features = df.groupby('product_id').agg(
            avg_sales=('sales', 'mean'),
            max_sales=('sales', 'max'),
            total_sales=('sales', 'sum'),
            price=('price', 'mean'),
            discount=('discount', 'mean'),
            months_active=('month', 'count')
        ).reset_index()

        # Label: sản phẩm bán chạy nếu total_sales > median
        median_sales = features['total_sales'].median()
        features['is_bestseller'] = (features['total_sales'] > median_sales).astype(int)
        return features

    def train(self, sales_data):
        df = self.prepare_features(sales_data)
        feature_cols = ['avg_sales', 'max_sales', 'price', 'discount', 'months_active']
        X = df[feature_cols]
        y = df['is_bestseller']

        if len(df) < 5:
            return False

        self.model.fit(X, y)
        self.trained = True
        self.feature_cols = feature_cols
        return True

    def predict(self, products_sales):
        """Trả về danh sách sản phẩm với xác suất là bestseller"""
        if not self.trained:
            return []

        df = self.prepare_features(products_sales)
        X = df[self.feature_cols]
        proba = self.model.predict_proba(X)[:, 1]
        df['probability'] = (proba * 100).round(1)
        df = df.sort_values('probability', ascending=False)

        return df[['product_id', 'total_sales', 'avg_sales', 'probability']].to_dict('records')


# Singleton instances
recommendation_engine = RecommendationEngine()
bestseller_predictor = BestSellerPredictor()
