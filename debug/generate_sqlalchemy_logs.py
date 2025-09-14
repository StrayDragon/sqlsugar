#!/usr/bin/env python3
"""
# /// script
# dependencies = [
#   "sqlalchemy>=2.0.0",
#   "aiosqlite>=0.19.0",
#   "rich>=13.0.0"
# ]
# ///
"""

import asyncio
import datetime
import random
from typing import List, Optional
from sqlalchemy import (
    create_engine,
    select,
    update,
    delete,
    insert,
    func,
    and_,
    or_,
    desc,
    asc,
    text,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Table,
    JSON
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    Session,
    sessionmaker
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table as RichTable

console = Console()

class Base(DeclarativeBase):
    pass

# Define models with relationships
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    age: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    orders: Mapped[List["Order"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    profile: Mapped[Optional["UserProfile"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(100))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    product_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)

    # Relationships
    order_items: Mapped[List["OrderItem"]] = relationship(back_populates="product")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    bio: Mapped[Optional[str]] = mapped_column(String(1000))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)

    # Relationships
    user: Mapped[User] = relationship(back_populates="profile")

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    order_date: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, completed, cancelled

    # Relationships
    user: Mapped[User] = relationship(back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(back_populates="order_items")

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"))

    # Self-referential relationship
    parent: Mapped[Optional["Category"]] = relationship(remote_side=[id])
    children: Mapped[List["Category"]] = relationship()

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(String(1000))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

# Association table for many-to-many relationship
product_tags = Table(
    'product_tags',
    Base.metadata,
    Column('product_id', Integer, ForeignKey('products.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Many-to-many relationship
    products: Mapped[List[Product]] = relationship(
        secondary=product_tags,
        back_populates="tags"
    )

# Add back-reference for Product
Product.tags = relationship("Tag", secondary=product_tags, back_populates="products")

async def generate_test_data(async_engine):
    """Generate test data for demonstration"""
    async with async_sessionmaker(async_engine)() as session:
        console.print("[bold blue]Generating test data...[/bold blue]")

        # Create categories
        categories = [
            Category(name="Electronics", description="Electronic devices and accessories"),
            Category(name="Books", description="Books and literature"),
            Category(name="Clothing", description="Apparel and fashion"),
            Category(name="Home & Garden", description="Home and garden products"),
            Category(name="Sports", description="Sports and outdoor equipment"),
            Category(name="Smartphones", description="Mobile devices", parent_id=1),
            Category(name="Laptops", description="Portable computers", parent_id=1),
        ]

        for category in categories:
            session.add(category)
        await session.commit()

        # Create tags
        tags = [
            Tag(name="popular"),
            Tag(name="new"),
            Tag(name="sale"),
            Tag(name="featured"),
            Tag(name="limited"),
        ]

        for tag in tags:
            session.add(tag)
        await session.commit()

        # Create products
        products = [
            Product(name="iPhone 15", price=999.99, category="Smartphones", stock=50,
                   metadata={"brand": "Apple", "model": "iPhone 15", "storage": "128GB"}),
            Product(name="MacBook Pro", price=2499.99, category="Laptops", stock=25,
                   metadata={"brand": "Apple", "model": "MacBook Pro", "cpu": "M3", "ram": "16GB"}),
            Product(name="Python Programming Book", price=39.99, category="Books", stock=100,
                   metadata={"author": "John Doe", "pages": 500, "language": "English"}),
            Product(name="Running Shoes", price=129.99, category="Sports", stock=75,
                   metadata={"brand": "Nike", "size_range": "6-12", "color": "black"}),
            Product(name="Coffee Maker", price=89.99, category="Home & Garden", stock=30,
                   metadata={"brand": "Breville", "capacity": "12 cups", "features": ["timer", "auto-off"]}),
        ]

        for product in products:
            session.add(product)

        # Assign tags to products
        products[0].tags = [tags[0], tags[1], tags[3]]  # iPhone: popular, new, featured
        products[1].tags = [tags[0], tags[3]]         # MacBook: popular, featured
        products[2].tags = [tags[1], tags[4]]         # Book: new, limited

        await session.commit()

        # Create users
        users = [
            User(name="Alice Johnson", email="alice@example.com", age=28, is_active=True),
            User(name="Bob Smith", email="bob@example.com", age=35, is_active=True),
            User(name="Carol White", email="carol@example.com", age=42, is_active=False),
            User(name="David Brown", email="david@example.com", age=31, is_active=True),
            User(name="Eva Davis", email="eva@example.com", age=26, is_active=True),
        ]

        for user in users:
            session.add(user)
        await session.commit()

        # Create user profiles
        profiles = [
            UserProfile(user_id=1, bio="Software developer passionate about technology",
                        preferences={"theme": "dark", "notifications": True}),
            UserProfile(user_id=2, bio="Data analyst and book lover",
                        preferences={"theme": "light", "newsletter": True}),
            UserProfile(user_id=4, bio="Fitness enthusiast and runner",
                        preferences={"theme": "dark", "language": "en"}),
        ]

        for profile in profiles:
            session.add(profile)
        await session.commit()

        # Create orders and order items
        orders = [
            Order(user_id=1, total_amount=1139.98, status="completed"),  # iPhone + Python book
            Order(user_id=2, total_amount=2499.99, status="completed"),  # MacBook Pro
            Order(user_id=1, total_amount=129.99, status="pending"),     # Running shoes
            Order(user_id=4, total_amount=89.99, status="completed"),   # Coffee maker
            Order(user_id=5, total_amount=999.99, status="cancelled"),  # iPhone (cancelled)
        ]

        for order in orders:
            session.add(order)
        await session.commit()

        # Create order items
        order_items = [
            OrderItem(order_id=1, product_id=1, quantity=1, unit_price=999.99),   # iPhone
            OrderItem(order_id=1, product_id=3, quantity=1, unit_price=139.99),   # Python book
            OrderItem(order_id=2, product_id=2, quantity=1, unit_price=2499.99),  # MacBook
            OrderItem(order_id=3, product_id=4, quantity=1, unit_price=129.99),   # Running shoes
            OrderItem(order_id=4, product_id=5, quantity=1, unit_price=89.99),    # Coffee maker
            OrderItem(order_id=5, product_id=1, quantity=1, unit_price=999.99),   # iPhone (cancelled)
        ]

        for item in order_items:
            session.add(item)
        await session.commit()

        # Create reviews
        reviews = [
            Review(product_id=1, user_id=1, rating=5, comment="Amazing phone! Love the camera quality."),
            Review(product_id=2, user_id=2, rating=4, comment="Great laptop, very fast and reliable."),
            Review(product_id=3, user_id=1, rating=5, comment="Excellent book for learning Python."),
            Review(product_id=4, user_id=4, rating=4, comment="Comfortable shoes for running."),
            Review(product_id=1, user_id=3, rating=3, comment="Good phone but a bit expensive."),
        ]

        for review in reviews:
            session.add(review)
        await session.commit()

        console.print("[bold green]Test data generated successfully![/bold green]")

async def demonstrate_basic_queries(async_session):
    """Demonstrate basic SQLAlchemy queries with logging"""
    console.print(Panel.fit("[bold cyan]Basic Queries[/bold cyan]", style="cyan"))

    async with async_session() as session:
        # Simple SELECT with question mark parameters
        console.print("\n[bold]1. Simple SELECT with question mark parameters:[/bold]")
        result = await session.execute(select(User).where(User.age > 30))
        users = result.scalars().all()
        console.print(f"Found {len(users)} users over 30 years old")

        # INSERT with parameters
        console.print("\n[bold]2. INSERT with parameters:[/bold]")
        new_user = User(name="Frank Miller", email="frank@example.com", age=45)
        session.add(new_user)
        await session.commit()
        console.print("Created new user")

        # UPDATE with named parameters
        console.print("\n[bold]3. UPDATE with named parameters:[/bold]")
        await session.execute(
            update(User)
            .where(User.name == "Alice Johnson")
            .values(age=29, is_active=True)
        )
        await session.commit()
        console.print("Updated Alice's age")

        # DELETE with parameters
        console.print("\n[bold]4. DELETE with parameters:[/bold]")
        await session.execute(delete(User).where(User.name == "Carol White"))
        await session.commit()
        console.print("Deleted inactive user")

async def demonstrate_complex_queries(async_session):
    """Demonstrate complex SQL queries with joins"""
    console.print(Panel.fit("[bold cyan]Complex Queries with Joins[/bold cyan]", style="cyan"))

    async with async_session() as session:
        # Complex JOIN with multiple tables
        console.print("\n[bold]5. Complex JOIN with multiple tables:[/bold]")
        stmt = (
            select(
                User.name,
                Order.id,
                Order.total_amount,
                func.count(OrderItem.id).label('item_count')
            )
            .join(Order, User.id == Order.user_id)
            .join(OrderItem, Order.id == OrderItem.order_id)
            .where(User.is_active == True)
            .group_by(User.id, Order.id)
            .having(func.count(OrderItem.id) > 0)
        )
        result = await session.execute(stmt)
        console.print("User orders with item counts:")
        for row in result:
            console.print(f"  {row.name}: Order #{row.id} (${row.total_amount:.2f}, {row.item_count} items)")

        # Subquery with EXISTS
        console.print("\n[bold]6. Subquery with EXISTS:[/bold]")
        subq = (
            select(func.count(Review.id))
            .where(Review.product_id == Product.id)
            .having(func.avg(Review.rating) > 4)
            .correlate(Product)
        )

        stmt = select(Product).where(subq.exists())
        result = await session.execute(stmt)
        products = result.scalars().all()
        console.print(f"Products with average rating > 4: {len(products)}")

        # Complex WHERE with OR and AND
        console.print("\n[bold]7. Complex WHERE with OR/AND:[/bold]")
        stmt = (
            select(Product)
            .where(
                or_(
                    and_(Product.category == "Electronics", Product.price > 1000),
                    and_(Product.category == "Books", Product.price < 50),
                    Product.stock < 10
                )
            )
        )
        result = await session.execute(stmt)
        products = result.scalars().all()
        console.print(f"Products matching complex criteria: {len(products)}")

        # Window function
        console.print("\n[bold]8. Window function for ranking:[/bold]")
        stmt = text("""
            SELECT
                p.name,
                p.price,
                p.category,
                RANK() OVER (PARTITION BY p.category ORDER BY p.price DESC) as price_rank
            FROM products p
            ORDER BY p.category, price_rank
        """)
        result = await session.execute(stmt)
        console.print("Product rankings by category:")
        for row in result:
            console.print(f"  {row.category}: {row.name} - Rank {row.price_rank} (${row.price:.2f})")

async def demonstrate_aggregate_queries(async_session):
    """Demonstrate aggregate functions and grouping"""
    console.print(Panel.fit("[bold cyan]Aggregate Functions and Grouping[/bold cyan]", style="cyan"))

    async with async_session() as session:
        # COUNT with GROUP BY
        console.print("\n[bold]9. COUNT with GROUP BY:[/bold]")
        stmt = (
            select(
                Product.category,
                func.count(Product.id).label('product_count'),
                func.avg(Product.price).label('avg_price'),
                func.sum(Product.stock).label('total_stock')
            )
            .group_by(Product.category)
            .having(func.count(Product.id) > 0)
        )
        result = await session.execute(stmt)
        for row in result:
            console.print(f"  {row.category}: {row.product_count} products, avg price: ${row.avg_price:.2f}, total stock: {row.total_stock}")

        # Multiple aggregations
        console.print("\n[bold]10. Multiple aggregations with JOIN:[/bold]")
        stmt = text("""
            SELECT
                u.name,
                COUNT(o.id) as order_count,
                COALESCE(SUM(o.total_amount), 0) as total_spent,
                COALESCE(AVG(o.total_amount), 0) as avg_order_value,
                MAX(o.order_date) as last_order_date
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            WHERE u.is_active = true
            GROUP BY u.id, u.name
            ORDER BY total_spent DESC
        """)
        result = await session.execute(stmt)
        for row in result:
            console.print(f"  {row.name}: {row.order_count} orders, spent: ${row.total_spent:.2f}, avg: ${row.avg_order_value:.2f}")

async def demonstrate_advanced_features(async_session):
    """Demonstrate advanced SQLAlchemy features"""
    console.print(Panel.fit("[bold cyan]Advanced SQLAlchemy Features[/bold cyan]", style="cyan"))

    async with async_session() as session:
        # JSON operations
        console.print("\n[bold]11. JSON operations:[/bold]")
        stmt = text("""
            SELECT * FROM products
            WHERE json_extract(metadata, '$.brand') = 'Apple'
        """)
        result = await session.execute(stmt)
        apple_products = result.fetchall()
        console.print(f"Apple products: {len(apple_products)}")

        # Date functions
        console.print("\n[bold]12. Date functions:[/bold]")
        stmt = text("""
            SELECT
                DATE(order_date) as order_date,
                COUNT(*) as daily_orders,
                SUM(total_amount) as daily_revenue
            FROM orders
            WHERE order_date >= date('now', '-7 days')
            GROUP BY DATE(order_date)
            ORDER BY order_date
        """)
        result = await session.execute(stmt)
        console.print("Daily order summary (last 7 days):")
        for row in result:
            console.print(f"  {row.order_date}: {row.daily_orders} orders, ${row.daily_revenue:.2f}")

        # CTE (Common Table Expression)
        console.print("\n[bold]13. CTE with recursive query:[/bold]")
        stmt = text("""
            WITH RECURSIVE category_tree AS (
                SELECT id, name, parent_id, name as path
                FROM categories
                WHERE parent_id IS NULL
                UNION ALL
                SELECT c.id, c.name, c.parent_id, ct.path || ' > ' || c.name
                FROM categories c
                JOIN category_tree ct ON c.parent_id = ct.id
            )
            SELECT * FROM category_tree ORDER BY path
        """)
        result = await session.execute(stmt)
        console.print("Category hierarchy:")
        for row in result:
            console.print(f"  {row.path}")

async def demonstrate_parameter_variations(async_session):
    """Demonstrate different parameter formats"""
    console.print(Panel.fit("[bold cyan]Parameter Format Variations[/bold cyan]", style="cyan"))

    async with async_session() as session:
        # Dictionary-style parameters
        console.print("\n[bold]14. Dictionary-style parameters:[/bold]")
        params = {'min_price': 100, 'max_price': 1000, 'category': 'Electronics'}
        stmt = text("""
            SELECT name, price, category
            FROM products
            WHERE price BETWEEN :min_price AND :max_price
            AND category = :category
            ORDER BY price
        """)
        result = await session.execute(stmt, params)
        for row in result:
            console.print(f"  {row.name}: ${row.price:.2f}")

        # List/tuple parameters
        console.print("\n[bold]15. List parameters:[/bold]")
        product_ids = [1, 2, 3]
        stmt = select(Product).where(Product.id.in_(product_ids))
        result = await session.execute(stmt)
        products = result.scalars().all()
        console.print(f"Products with IDs {product_ids}: {len(products)}")

        # Mixed parameter types
        console.print("\n[bold]16. Mixed parameter types:[/bold]")
        stmt = text("""
            SELECT u.name, u.email, o.total_amount, o.status
            FROM users u
            JOIN orders o ON u.id = o.user_id
            WHERE u.is_active = :is_active
            AND o.status IN (:status1, :status2)
            AND o.total_amount > :min_amount
        """)
        params = {
            'is_active': True,
            'status1': 'completed',
            'status2': 'pending',
            'min_amount': 100.0
        }
        result = await session.execute(stmt, params)
        console.print("Active users with significant orders:")
        for row in result:
            console.print(f"  {row.name} ({row.email}): ${row.total_amount:.2f} ({row.status})")

async def demonstrate_error_scenarios(async_session):
    """Demonstrate some error scenarios and edge cases"""
    console.print(Panel.fit("[bold cyan]Error Scenarios and Edge Cases[/bold cyan]", style="cyan"))

    async with async_session() as session:
        # NULL handling
        console.print("\n[bold]17. NULL handling:[/bold]")
        stmt = select(User).where(User.profile == None)
        result = await session.execute(stmt)
        users_without_profile = result.scalars().all()
        console.print(f"Users without profile: {len(users_without_profile)}")

        # Empty strings
        console.print("\n[bold]18. Empty string handling:[/bold]")
        stmt = text("SELECT name FROM users WHERE name = '' OR email = ''")
        result = await session.execute(stmt)
        empty_users = result.fetchall()
        console.print(f"Users with empty names/emails: {len(empty_users)}")

        # Large numbers
        console.print("\n[bold]19. Large number handling:[/bold]")
        stmt = text("SELECT :large_number as test_num")
        result = await session.execute(stmt, {'large_number': 999999999999999})
        large_num = result.scalar()
        console.print(f"Large number test: {large_num}")

async def main():
    """Main function to run all demonstrations"""
    console.print(Panel.fit("[bold magenta]SQLAlchemy Log Generator for Testing[/bold magenta]", style="magenta"))
    console.print("This script generates various SQLAlchemy logs to test the SQL copy feature.")

    # Create async engine with logging enabled
    console.print("\n[bold yellow]Setting up database engine with logging...[/bold yellow]")
    async_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=True,  # This enables SQL logging
        echo_pool=True,
    )

    # Create session factory
    async_session = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

    # Create tables
    console.print("[bold yellow]Creating database tables...[/bold yellow]")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Generate test data
        await generate_test_data(async_engine)

        # Run demonstrations
        await demonstrate_basic_queries(async_session)
        await demonstrate_complex_queries(async_session)
        await demonstrate_aggregate_queries(async_session)
        await demonstrate_advanced_features(async_session)
        await demonstrate_parameter_variations(async_session)
        await demonstrate_error_scenarios(async_session)

        console.print("\n[bold green]✅ All demonstrations completed![/bold green]")
        console.print("Check the terminal output above for SQLAlchemy logs.")
        console.print("You can now test the 'Copy SQL (Injected)' feature on these logs.")

    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        raise
    finally:
        await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())