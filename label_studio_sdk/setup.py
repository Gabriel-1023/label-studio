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
        "jsonschema>=4.0.0",
        "lxml>=4.6.0",
        "xmljson>=0.2.0",
        "jsf>=0.7.0",
        "numpy>=1.19.0",
        "Pillow>=8.0.0",
        "nltk>=3.6.0",
        "ijson>=3.1.0",
        "ujson>=4.0.0",
    ],
    include_package_data=True,
    zip_safe=False,
) 