import java.util.Base64

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.freezzz.platform"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.freezzz.platform"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}


tasks.register("restorePhotoIcon") {
    doLast {
        val source = rootProject.file("icon/freezzz_icon.b64")
        val target = project.file("src/main/res/drawable/freezzz_photo.png")
        target.parentFile.mkdirs()
        target.writeBytes(Base64.getDecoder().decode(source.readText().trim()))
    }
}
tasks.named("preBuild").configure { dependsOn("restorePhotoIcon") }

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-ktx:1.11.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.webkit:webkit:1.14.0")
}
