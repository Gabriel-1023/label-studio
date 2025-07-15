from setuptools import setup, find_packages

setup(
    name="label-studio-sdk",
    version="1.0.18",
    description="Label Studio SDK for Python",
    author="HumanSignal",
    author_email="support@humansignal.com",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.25.1",
        "pydantic>=1.8.0",
        "httpx>=0.27.0",
        "typing-extensions>=4.0.0",
    ],
    include_package_data=True,
    zip_safe=False,
) 