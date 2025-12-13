$usersToRemove = @(
    "Kirusan.s@azendtech.com",
    "Nalindaka.H@azendtech.com",
    "Nipuna.j@azendtech.com",
    "Selva.s@azendtech.com",
    "akshitha.a@azendtech.com",
    "chamindu.m@azendtech.com",
    "darshana.h@azendtech.com",
    "dasitha.w@azendtech.com",
    "dilani@azendtech.com",
    "dinuka.r@azendtech.com",
    "iran@azendtech.com",
    "kavuri.k@azendtech.com",
    "koshaliya.s@azendtech.com",
    "lahiru.h@azendtech.com",
    "madhushan.k@azendtech.com",
    "matthew.r@azendtech.com",
    "mifras.g@azendtech.com",
    "musharaf.a@azendtech.com",
    "nadun.n@azendtech.com",
    "nayanajith.g@azendtech.com",
    "nayod.w@azendtech.com",
    "pavara.manu@azendtech.com",
    "rashiprabha.a@azendtech.com",
    "shanmugabavan.s@azendtech.com",
    "shenal.g@azendtech.com",
    "shenan.p@azendtech.com",
    "steve.b@azendtech.com",
    "suja.a@azendtech.com",
    "thusitha.s@azendtech.com",
    "vihanga.j@azendtech.com",
    "vinura.j@azendtech.com",
    "Vishwa.w@azendtech.com"
)

foreach ($user in $usersToRemove) {
    Write-Host "Deleting user: $user"
    az ad user delete --id $user
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully deleted $user" -ForegroundColor Green
    } else {
        Write-Host "Failed to delete ${user}. It may not exist or you may lack permissions." -ForegroundColor Red
    }
}
