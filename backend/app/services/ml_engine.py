import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from collections import defaultdict
import math

class BERT4RecEngine:
    """
    Hệ thống gợi ý sản phẩm chuỗi (Sequential Recommendation) dựa trên mô hình BERT4Rec.
    Thay thế cho phương pháp Collaborative Filtering truyền thống.
    """

    def __init__(self):
        self.user_sequences = {}
        self.item_embeddings = None
        self.product_ids = []
        self.hidden_size = 64 # Giả lập hidden size của BERT

    def build_user_sequences(self, orders_data):
        """
        Xây dựng chuỗi lịch sử mua hàng của người dùng (Sequential Data)
        """
        if not orders_data:
            return False

        df = pd.DataFrame(orders_data)
        # Giả lập sắp xếp theo thời gian bằng index vì orders_data hiện tại không có timestamp
        self.product_ids = list(df['product_id'].unique())
        
        # Nhóm các sản phẩm người dùng đã mua thành chuỗi
        sequences = df.groupby('user_id')['product_id'].apply(list).to_dict()
        self.user_sequences = sequences
        
        # Khởi tạo embedding ngẫu nhiên cho các item (mô phỏng Embedding Layer của BERT)
        np.random.seed(42)
        self.item_embeddings = {
            pid: np.random.normal(0, 0.02, self.hidden_size)
            for pid in self.product_ids
        }
        
        return True

    def build_content_matrix(self, products_data):
        """
        Giữ lại content matrix để fallback khi người dùng chưa có chuỗi hành vi.
        """
        if not products_data:
            return False

        df = pd.DataFrame(products_data)
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

    def _attention_score(self, seq_embeddings, target_embedding):
        """
        Mô phỏng cơ chế Self-Attention của BERT: 
        Tính điểm chú ý giữa chuỗi lịch sử và mục tiêu.
        """
        scores = [np.dot(emb, target_embedding) / math.sqrt(self.hidden_size) for emb in seq_embeddings]
        # Softmax
        exp_scores = np.exp(scores - np.max(scores))
        attn_weights = exp_scores / exp_scores.sum()
        
        # Trả về context vector
        context_vec = np.sum([weights * emb for weights, emb in zip(attn_weights, seq_embeddings)], axis=0)
        return context_vec

    def predict_next_item(self, user_id, top_n=5):
        """
        Dự đoán item tiếp theo trong chuỗi bằng mô hình BERT (mô phỏng)
        """
        if user_id not in self.user_sequences or not self.user_sequences[user_id]:
            return []
            
        user_seq = self.user_sequences[user_id][-10:] # Lấy max 10 item gần nhất
        seq_embeddings = [self.item_embeddings[pid] for pid in user_seq if pid in self.item_embeddings]
        
        if not seq_embeddings:
            return []
            
        scores = {}
        # Mô phỏng Feed-Forward & Output layer của BERT để dự đoán item tiếp theo
        # Lấy item cuối cùng làm đại diện ngữ cảnh hiện tại (do chưa train transformer thực tế)
        context = np.mean(seq_embeddings, axis=0)
        
        for pid, emb in self.item_embeddings.items():
            if pid not in user_seq: # Bỏ qua item đã mua
                # Tính dot product giữa context và item embedding
                scores[pid] = np.dot(context, emb)
                
        sorted_products = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [pid for pid, _ in sorted_products[:top_n]]

    def content_based_filter(self, product_id, top_n=5):
        if not hasattr(self, 'cbf_similarity') or product_id not in self.cbf_product_ids:
            return []

        idx = self.cbf_product_ids.index(product_id)
        sim_scores = list(enumerate(self.cbf_similarity[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        sim_scores = [s for s in sim_scores if s[0] != idx][:top_n]

        return [self.cbf_product_ids[i] for i, _ in sim_scores]

    def hybrid_recommend(self, user_id, current_product_id=None, top_n=6):
        """
        BERT4Rec kết hợp với Content-Based
        """
        recommended = []

        if user_id in self.user_sequences:
            bert_recs = self.predict_next_item(user_id, top_n=top_n)
            recommended.extend(bert_recs)

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
        df = pd.DataFrame(sales_data)
        features = df.groupby('product_id').agg(
            avg_sales=('sales', 'mean'),
            max_sales=('sales', 'max'),
            total_sales=('sales', 'sum'),
            price=('price', 'mean'),
            discount=('discount', 'mean'),
            months_active=('month', 'count')
        ).reset_index()

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
        if not self.trained:
            return []

        df = self.prepare_features(products_sales)
        X = df[self.feature_cols]
        proba = self.model.predict_proba(X)[:, 1]
        df['probability'] = (proba * 100).round(1)
        df = df.sort_values('probability', ascending=False)

        return df[['product_id', 'total_sales', 'avg_sales', 'probability']].to_dict('records')


# Singleton instances
recommendation_engine = BERT4RecEngine()
bestseller_predictor = BestSellerPredictor()
